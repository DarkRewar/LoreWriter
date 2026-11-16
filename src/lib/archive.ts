/**
 * Mini writer/reader ZIP, sans dépendance externe : les entrées sont
 * compressées en deflate-raw via l'API CompressionStream (navigateur et
 * Node >= 18). produit un ZIP standard lisible par n'importe quel outil.
 */

export interface ZipEntryInput {
  name: string
  content: string | Uint8Array
}

export interface ZipEntryOutput {
  name: string
  content: Uint8Array
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(d: Date): { time: number; date: number } {
  const year = Math.max(1980, d.getFullYear())
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: (((year - 1980) & 0x7f) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  }
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

const LOCAL_SIG = 0x04034b50
const CENTRAL_SIG = 0x02014b50
const EOCD_SIG = 0x06054b50
const UTF8_FLAG = 0x0800

/** Construit une archive ZIP (méthode deflate, ou stockée si incompressible). */
export async function createZip(entries: ZipEntryInput[]): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const { time, date } = dosDateTime(new Date())
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const e of entries) {
    const nameBytes = encoder.encode(e.name)
    const raw = typeof e.content === 'string' ? encoder.encode(e.content) : e.content
    const crc = crc32(raw)
    const compressed = await deflateRaw(raw)
    const useDeflate = compressed.length < raw.length
    const payload = useDeflate ? compressed : raw
    const method = useDeflate ? 8 : 0

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, LOCAL_SIG, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, UTF8_FLAG, true)
    local.setUint16(8, method, true)
    local.setUint16(10, time, true)
    local.setUint16(12, date, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, payload.length, true)
    local.setUint32(22, raw.length, true)
    local.setUint16(26, nameBytes.length, true)
    local.setUint16(28, 0, true)
    chunks.push(new Uint8Array(local.buffer), nameBytes, payload)

    const cen = new DataView(new ArrayBuffer(46))
    cen.setUint32(0, CENTRAL_SIG, true)
    cen.setUint16(4, 20, true)
    cen.setUint16(6, 20, true)
    cen.setUint16(8, UTF8_FLAG, true)
    cen.setUint16(10, method, true)
    cen.setUint16(12, time, true)
    cen.setUint16(14, date, true)
    cen.setUint32(16, crc, true)
    cen.setUint32(20, payload.length, true)
    cen.setUint32(24, raw.length, true)
    cen.setUint16(28, nameBytes.length, true)
    cen.setUint16(30, 0, true)
    cen.setUint16(32, 0, true)
    cen.setUint16(34, 0, true)
    cen.setUint16(36, 0, true)
    cen.setUint32(38, 0, true)
    cen.setUint32(42, offset, true)
    central.push(new Uint8Array(cen.buffer), nameBytes)

    offset += 30 + nameBytes.length + payload.length
  }
  const cdStart = offset
  let cdSize = 0
  for (const c of central) {
    chunks.push(c)
    cdSize += c.length
  }
  const eocd = new DataView(new ArrayBuffer(22))
  eocd.setUint32(0, EOCD_SIG, true)
  eocd.setUint16(4, 0, true)
  eocd.setUint16(6, 0, true)
  eocd.setUint16(8, entries.length, true)
  eocd.setUint16(10, entries.length, true)
  eocd.setUint32(12, cdSize, true)
  eocd.setUint32(16, cdStart, true)
  eocd.setUint16(20, 0, true)
  chunks.push(new Uint8Array(eocd.buffer))

  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let pos = 0
  for (const c of chunks) {
    out.set(c, pos)
    pos += c.length
  }
  return out
}

/** Relit une archive ZIP (méthodes stockée et deflate), avec vérification CRC. */
export async function extractZip(bytes: Uint8Array): Promise<ZipEntryOutput[]> {
  if (bytes.length < 22) throw new Error('Archive illisible (trop petite).')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let eocd = -1
  const from = Math.max(0, bytes.length - 22 - 65536)
  for (let i = bytes.length - 22; i >= from; i--) {
    if (view.getUint32(i, true) === EOCD_SIG) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error("Archive ZIP invalide (fin d'archive introuvable).")
  const count = view.getUint16(eocd + 10, true)
  let pos = view.getUint32(eocd + 16, true)
  const decoder = new TextDecoder()
  const out: ZipEntryOutput[] = []
  for (let n = 0; n < count; n++) {
    if (pos + 46 > bytes.length || view.getUint32(pos, true) !== CENTRAL_SIG) {
      throw new Error('Archive ZIP invalide (annuaire central).')
    }
    const method = view.getUint16(pos + 10, true)
    const crc = view.getUint32(pos + 16, true)
    const csize = view.getUint32(pos + 20, true)
    const usize = view.getUint32(pos + 24, true)
    const nameLen = view.getUint16(pos + 28, true)
    const extraLen = view.getUint16(pos + 30, true)
    const commentLen = view.getUint16(pos + 32, true)
    const localOffset = view.getUint32(pos + 42, true)
    const name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLen))
    pos += 46 + nameLen + extraLen + commentLen
    if (name.endsWith('/')) continue
    if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== LOCAL_SIG) {
      throw new Error('Archive ZIP invalide (en-tête local).')
    }
    const lNameLen = view.getUint16(localOffset + 26, true)
    const lExtraLen = view.getUint16(localOffset + 28, true)
    const dataStart = localOffset + 30 + lNameLen + lExtraLen
    const compressed = bytes.subarray(dataStart, dataStart + csize)
    let content: Uint8Array
    if (method === 0) content = compressed.slice()
    else if (method === 8) content = await inflateRaw(compressed)
    else throw new Error(`Compression non supportée (méthode ${method}) pour « ${name} ».`)
    if (content.length !== usize) throw new Error(`Archive corrompue (taille, « ${name} »).`)
    if (crc32(content) !== crc) throw new Error(`Archive corrompue (CRC, « ${name} »).`)
    out.push({ name, content })
  }
  return out
}
