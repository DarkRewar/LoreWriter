import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import http from 'node:http'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Test d'intégration de la synchro WebDAV, en loopback uniquement :
 * un mini-serveur WebDAV (MKCOL/PUT/GET/DELETE/PROPFIND) tourne sur 127.0.0.1
 * et la base Dexie est remplacée par une fausse DB en mémoire.
 */

const mem = vi.hoisted(() => {
  interface Row {
    id: string
    [k: string]: unknown
  }
  const tables: Record<string, Row[]> = {
    projects: [],
    characters: [],
    relationships: [],
    dialogueScenes: [],
    novels: [],
    chapters: [],
    plots: [],
    wikiEntries: [],
  }
  const makeTable = (name: string) => {
    const rows = tables[name]
    return {
      get: async (id: string) => rows.find((r) => r.id === id),
      add: async (r: Row) => {
        rows.push(r)
        return r.id
      },
      put: async (r: Row) => {
        const i = rows.findIndex((x) => x.id === r.id)
        if (i >= 0) rows[i] = r
        else rows.push(r)
        return r.id
      },
      bulkPut: async (rs: Row[]) => {
        for (const r of rs) {
          const i = rows.findIndex((x) => x.id === r.id)
          if (i >= 0) rows[i] = r
          else rows.push(r)
        }
        return rs.map((r) => r.id)
      },
      update: async (id: string, patch: Partial<Row>) => {
        const r = rows.find((x) => x.id === id)
        if (r) Object.assign(r, patch)
        return r ? 1 : 0
      },
      delete: async (id: string) => {
        const i = rows.findIndex((x) => x.id === id)
        if (i >= 0) rows.splice(i, 1)
      },
      toArray: async () => [...rows],
      count: async () => rows.length,
      where: (key: string) => ({
        equals: (v: unknown) => ({
          toArray: async () => rows.filter((r) => r[key] === v),
          count: async () => rows.filter((r) => r[key] === v).length,
          delete: async () => {
            for (let i = rows.length - 1; i >= 0; i--) if (rows[i][key] === v) rows.splice(i, 1)
          },
        }),
      }),
    }
  }
  const db = {
    projects: makeTable('projects'),
    characters: makeTable('characters'),
    relationships: makeTable('relationships'),
    dialogueScenes: makeTable('dialogueScenes'),
    novels: makeTable('novels'),
    chapters: makeTable('chapters'),
    plots: makeTable('plots'),
    wikiEntries: makeTable('wikiEntries'),
    transaction: async (_mode: string, _tables: unknown[], fn: () => Promise<unknown>) => fn(),
  }
  return { tables, db }
})

vi.mock('../db', () => ({ db: mem.db }))
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
})

import { syncProjectWithCloud, type CloudConfig } from './cloud'

let root = ''
let server: http.Server
let port = 0

async function startWebdav(): Promise<void> {
  root = mkdtempSync(join(tmpdir(), 'lorewriter-webdav-'))
  server = http.createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
    const file = join(root, path)
    const send = (code: number, body = '', type = 'text/plain') => {
      res.writeHead(code, { 'Content-Type': type })
      res.end(body)
    }
    if (req.method === 'MKCOL') {
      mkdirSync(file, { recursive: true })
      return send(201)
    }
    if (req.method === 'PUT') {
      let body = ''
      req.on('data', (c: Buffer) => (body += c.toString('utf8')))
      req.on('end', () => {
        mkdirSync(join(file, '..'), { recursive: true })
        writeFileSync(file, body)
        send(201)
      })
      return
    }
    if (req.method === 'GET') {
      if (existsSync(file) && statSync(file).isFile()) return send(200, readFileSync(file, 'utf8'))
      return send(404)
    }
    if (req.method === 'DELETE') {
      if (existsSync(file)) {
        rmSync(file, { recursive: true })
        return send(204)
      }
      return send(404)
    }
    if (req.method === 'PROPFIND') {
      if (!existsSync(file) || !statSync(file).isDirectory()) return send(404)
      const depth = req.headers.depth ?? '0'
      const base = path.endsWith('/') ? path : path + '/'
      let xml = '<?xml version="1.0" encoding="utf-8"?><d:multistatus xmlns:d="DAV:">'
      const add = (hrefPath: string, isDir: boolean) => {
        xml += `<d:response><d:href>${hrefPath}${isDir ? '/' : ''}</d:href><d:propstat><d:prop><d:resourcetype>${
          isDir ? '<d:collection/>' : ''
        }</d:resourcetype></d:prop></d:propstat></d:response>`
      }
      add(path, true)
      if (depth === '1') {
        for (const name of readdirSync(file)) {
          add(base + encodeURIComponent(name), statSync(join(file, name)).isDirectory())
        }
      }
      xml += '</d:multistatus>'
      return send(207, xml, 'application/xml')
    }
    send(405)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  port = (server.address() as { port: number }).port
}

const cfg = (): CloudConfig => ({
  provider: 'webdav',
  baseUrl: `http://127.0.0.1:${port}/remote.php/dav/files/alice`,
  username: 'alice',
  password: 'secret',
  folder: 'LoreWriter',
  enabled: true,
})

const remoteFile = (...parts: string[]) => join(root, 'remote.php/dav/files/alice/LoreWriter/lorewriter', ...parts)

function seedProject() {
  mem.tables.projects.push({ id: 'p1', name: 'Projet test', description: '', createdAt: 1, updatedAt: 1 })
  mem.tables.characters.push({
    id: 'c1', projectId: 'p1', firstName: 'Ana', lastName: 'A', nickname: '', birthDate: '', manualAge: null,
    role: 'Héroïne', tags: ['magie'], metadata: [], description: '', portrait: '', createdAt: 1, updatedAt: 1,
  })
  mem.tables.novels.push({ id: 'n1', projectId: 'p1', title: 'Roman', createdAt: 1, updatedAt: 1 })
  mem.tables.chapters.push({
    id: 'ch1', projectId: 'p1', novelId: 'n1', title: 'Chapitre 1', content: '<p>Bonjour le monde.</p>', order: 0, createdAt: 1, updatedAt: 1,
  })
  mem.tables.dialogueScenes.push({
    id: 's1', projectId: 'p1', title: 'La cave', description: '', plotId: '', createdAt: 1, updatedAt: 1,
    lines: [{ id: 'l1', characterId: 'c1', text: 'Salut.' }],
  })
  mem.tables.plots.push({ id: 'pl1', projectId: 'p1', title: 'Intrigue', synopsis: '', status: 'idea', tags: [], characterIds: ['c1'], createdAt: 1, updatedAt: 1 })
  mem.tables.wikiEntries.push({ id: 'w1', projectId: 'p1', title: 'Aubeval', content: '<p>Royaume fortifié.</p>', createdAt: 1, updatedAt: 1 })
}

beforeAll(async () => {
  await startWebdav()
  seedProject()
})

afterAll(() => {
  server?.close()
  if (root) rmSync(root, { recursive: true, force: true })
})

describe('synchro WebDAV multi-fichiers (loopback)', () => {
  it('pousse le projet en plusieurs fichiers (project.json + chapters/*.md + dialogues/*.json)', async () => {
    const st = await syncProjectWithCloud('p1', cfg())
    expect(st.action).toBe('nothing-remote')
    expect(existsSync(remoteFile('p1', 'project.json'))).toBe(true)
    expect(existsSync(remoteFile('p1', 'chapters', 'ch1.md'))).toBe(true)
    expect(existsSync(remoteFile('p1', 'dialogues', 's1.json'))).toBe(true)
    expect(existsSync(remoteFile('p1', 'wiki', 'w1.md'))).toBe(true)
    expect(readFileSync(remoteFile('p1', 'wiki', 'w1.md'), 'utf8')).toContain('Aubeval')
    const md = readFileSync(remoteFile('p1', 'chapters', 'ch1.md'), 'utf8')
    expect(md).toContain('id: "ch1"')
    expect(md).toContain('Bonjour le monde.')
    const base = JSON.parse(readFileSync(remoteFile('p1', 'project.json'), 'utf8'))
    expect(base.project.id).toBe('p1')
    expect(base.chapters).toEqual([])
    expect(base.plots[0].title).toBe('Intrigue')
  })

  it('récupère et fusionne les modifications distantes (autre appareil), puis renvoie', async () => {
    const chPath = remoteFile('p1', 'chapters', 'ch1.md')
    writeFileSync(
      chPath,
      '---\nid: "ch1"\nprojectId: "p1"\nnovelId: "n1"\ntitle: "Chapitre 1"\norder: 0\ncreatedAt: 1\nupdatedAt: 999\n---\n\n## Modifié ailleurs\n',
    )
    mkdirSync(remoteFile('p1', 'dialogues'), { recursive: true })
    writeFileSync(
      remoteFile('p1', 'dialogues', 's2.json'),
      JSON.stringify({
        id: 's2', projectId: 'p1', title: 'Scène ajoutée ailleurs', description: '', plotId: '',
        lines: [{ id: 'l9', characterId: 'c1', text: 'Yo.' }], createdAt: 2, updatedAt: 5,
      }),
    )
    const st = await syncProjectWithCloud('p1', cfg())
    expect(st.action).toBe('pulled-merged')
    const ch = mem.tables.chapters.find((c) => c.id === 'ch1')
    expect(ch?.updatedAt).toBe(999)
    expect(String(ch?.content)).toContain('Modifié ailleurs')
    expect(mem.tables.dialogueScenes.find((s) => s.id === 's2')?.title).toBe('Scène ajoutée ailleurs')
    expect(existsSync(remoteFile('p1', 'dialogues', 's2.json'))).toBe(true)
  })

  it('migre l\'ancien fichier unique <id>.json (v1) vers le multi-fichiers et le supprime', async () => {
    rmSync(remoteFile('p1'), { recursive: true, force: true })
    mkdirSync(join(remoteFile('p1'), '..'), { recursive: true })
    const legacy = {
      format: 'lorewriter-snapshot',
      version: 1,
      exportedAt: 1,
      project: { id: 'p1', name: 'Projet test (legacy)', description: '', createdAt: 1, updatedAt: 50 },
      characters: [],
      relationships: [],
      dialogueScenes: [],
      chapters: [],
      plots: [],
    }
    writeFileSync(remoteFile('p1.json'), JSON.stringify(legacy))
    const st = await syncProjectWithCloud('p1', cfg())
    expect(st.action).toBe('pulled-merged')
    expect(mem.tables.projects.find((p) => p.id === 'p1')?.name).toBe('Projet test (legacy)')
    expect(existsSync(remoteFile('p1', 'project.json'))).toBe(true)
    expect(existsSync(remoteFile('p1.json'))).toBe(false)
  })
})
