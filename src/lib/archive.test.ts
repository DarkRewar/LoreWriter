import { describe, expect, it } from 'vitest'
import { createZip, crc32, extractZip } from './archive'

describe('crc32', () => {
  it('a la valeur de référence pour "123456789"', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })
})

describe('createZip / extractZip', () => {
  it('produit un ZIP standard (signatures PK) et le relit fidèlement', async () => {
    const entries = [
      { name: 'project.json', content: '{"format":"lorewriter-snapshot"}' },
      { name: 'chapters/ch1.md', content: '# Chapitre 1\n\nIl était **une fois** — été à Paris.\n' },
      { name: 'dialogues/s1.json', content: '{"id":"s1","lines":[{"text":"Salut l\'ami !"}]}' },
      { name: 'chapters/Été — très long nom avec accents.md', content: 'x'.repeat(5000) },
      { name: 'empty.txt', content: '' },
    ]
    const zip = await createZip(entries)
    expect(zip[0]).toBe(0x50) // 'P'
    expect(zip[1]).toBe(0x4b) // 'K'
    expect(zip[2]).toBe(0x03)
    expect(zip[3]).toBe(0x04)
    const back = await extractZip(zip)
    expect(back.map((e) => e.name).sort()).toEqual(entries.map((e) => e.name).sort())
    const dec = new TextDecoder()
    for (const e of entries) {
      const found = back.find((b) => b.name === e.name)!
      expect(dec.decode(found.content)).toBe(e.content)
    }
  })

  it('supporte du contenu binaire', async () => {
    const bin = new Uint8Array(1024)
    for (let i = 0; i < bin.length; i++) bin[i] = i % 251
    const zip = await createZip([{ name: 'data.bin', content: bin }])
    const back = await extractZip(zip)
    expect([...back[0].content]).toEqual([...bin])
  })

  it('compresse réellement le texte répétitif', async () => {
    const zip = await createZip([{ name: 'big.txt', content: 'lorem ipsum '.repeat(2000) }])
    expect(zip.length).toBeLessThan(2000)
  })

  it('rejette un contenu qui n\'est pas un ZIP', async () => {
    await expect(extractZip(new TextEncoder().encode('ceci n est pas un zip'))).rejects.toThrow(/invalide|illisible/)
    await expect(extractZip(new Uint8Array(4))).rejects.toThrow(/illisible/)
  })

  it('détecte une archive corrompue (CRC)', async () => {
    const zip = await createZip([{ name: 'a.txt', content: 'contenu de test' }])
    zip[40] ^= 0xff // altère un octet de données
    await expect(extractZip(zip)).rejects.toThrow(/corrompue/)
  })
})
