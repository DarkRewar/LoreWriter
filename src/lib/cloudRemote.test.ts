import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    deletions: [],
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
    deletions: makeTable('deletions'),
    transaction: async (_mode: string, _tables: unknown[], fn: () => Promise<unknown>) => fn(),
  }
  return { tables, db }
})

vi.mock('../db', () => ({ db: mem.db }))
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} })

import { downloadRemoteProject, listRemoteProjects, parsePropfindDirs, type CloudConfig } from './cloud'

const cfg: CloudConfig = {
  provider: 'webdav',
  baseUrl: 'https://dav.example.com/files/alice',
  username: 'alice',
  password: 'secret',
  folder: 'LoreWriter',
  enabled: true,
}

const PROJECTS_DIR = 'https://dav.example.com/files/alice/LoreWriter/lorewriter/'

function multistatus(basePath: string, entries: Array<[string, boolean]>): string {
  const responses = entries
    .map(([name, isDir]) => `<d:response><d:href>${basePath}${encodeURIComponent(name)}${isDir ? '/' : ''}</d:href></d:response>`)
    .join('')
  return `<?xml version="1.0"?><d:multistatus xmlns:d="DAV:">${responses}</d:multistatus>`
}

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, text: async () => (body === null ? '' : JSON.stringify(body)) }
}

const baseSnapshot = {
  format: 'lorewriter-snapshot',
  version: 2,
  exportedAt: 1,
  project: { id: 'p1', name: 'Alpha', description: '', createdAt: 1, updatedAt: 10 },
  characters: [],
  relationships: [],
  dialogueScenes: [],
  novels: [{ id: 'n1', projectId: 'p1', title: 'Roman', createdAt: 1, updatedAt: 1 }],
  chapters: [],
  plots: [],
}

const chapterMd = '---\nid: "ch1"\nprojectId: "p1"\nnovelId: "n1"\ntitle: "Chapitre 1"\norder: 0\ncreatedAt: 1\nupdatedAt: 2\n---\n\nBonjour.\n'

function stubFetch() {
  return vi.fn(async (url: string, init?: { method?: string }) => {
    const method = init?.method ?? 'GET'
    if (method === 'PROPFIND' && url === PROJECTS_DIR) {
      return {
        ok: true,
        status: 207,
        text: async () => multistatus('/files/alice/LoreWriter/lorewriter/', [['p1', true], ['p2', true], ['ch1.md', false]]),
      }
    }
    if (method === 'PROPFIND' && url === `${PROJECTS_DIR}p1/chapters/`) {
      return { ok: true, status: 207, text: async () => multistatus('/files/alice/LoreWriter/lorewriter/p1/chapters/', [['ch1.md', false]]) }
    }
    if (method === 'PROPFIND' && url === `${PROJECTS_DIR}p1/dialogues/`) {
      return { ok: true, status: 207, text: async () => multistatus('/files/alice/LoreWriter/lorewriter/p1/dialogues/', []) }
    }
    if (method === 'GET' && url === `${PROJECTS_DIR}p1/project.json`) return jsonResponse(200, baseSnapshot)
    if (method === 'GET' && url === `${PROJECTS_DIR}p1/chapters/ch1.md`) {
      return { ok: true, status: 200, text: async () => chapterMd }
    }
    if (method === 'GET' && url === `${PROJECTS_DIR}p2/project.json`) return jsonResponse(404, null)
    return jsonResponse(404, null)
  })
}

beforeEach(() => {
  for (const rows of Object.values(mem.tables)) rows.length = 0
})

describe('parsePropfindDirs', () => {
  it('extrait les dossiers (slash final retiré) et ignore les fichiers', () => {
    const xml = multistatus('/dav/LoreWriter/lorewriter/', [
      ['p1', true],
      ['p2 draft', true],
      ['notes.txt', false],
    ])
    expect(parsePropfindDirs(xml, 'https://dav.example.com/dav/LoreWriter/lorewriter/')).toEqual(['p1', 'p2 draft'])
  })
})

describe('listRemoteProjects', () => {
  it('découvre les projets distants via PROPFIND + project.json, en ignorant les dossiers sans base', async () => {
    vi.stubGlobal('fetch', stubFetch())
    const remote = await listRemoteProjects(cfg)
    expect(remote).toEqual([{ id: 'p1', name: 'Alpha', updatedAt: 10 }])
  })

  it('retourne [] si le dossier lorewriter/ n\'existe pas (404)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, text: async () => '' })))
    expect(await listRemoteProjects(cfg)).toEqual([])
  })
})

describe('downloadRemoteProject', () => {
  it('télécharge le projet distant complet et l\'importe en local', async () => {
    vi.stubGlobal('fetch', stubFetch())
    const id = await downloadRemoteProject('p1', cfg)
    expect(id).toBe('p1')
    expect(mem.tables.projects.find((p) => p.id === 'p1')?.name).toBe('Alpha')
    expect(mem.tables.novels.map((n) => n.id)).toEqual(['n1'])
    const ch = mem.tables.chapters.find((c) => c.id === 'ch1')
    expect(ch?.title).toBe('Chapitre 1')
    expect(String(ch?.content)).toContain('Bonjour.')
  })

  it('lève une erreur si le projet n\'existe pas côté serveur', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, text: async () => '' })))
    await expect(downloadRemoteProject('inconnu', cfg)).rejects.toThrow('introuvable')
  })
})
