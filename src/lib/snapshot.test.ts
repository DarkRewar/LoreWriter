import { describe, expect, it } from 'vitest'
import { mergeSnapshots, parseSnapshot, remapSnapshotIds, serializeSnapshot, SNAPSHOT_FORMAT, type ProjectSnapshot } from './snapshot'
import type { Project } from '../types'

const project = (over: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Mon histoire',
  description: '',
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

const baseSnapshot = (over: Partial<ProjectSnapshot> = {}): ProjectSnapshot => ({
  format: SNAPSHOT_FORMAT,
  version: 2,
  exportedAt: 1,
  project: project(),
  characters: [],
  relationships: [],
  dialogueScenes: [],
  novels: [],
  chapters: [],
  plots: [],
  wiki: [],
  ...over,
})

describe('parseSnapshot', () => {
  it('parse un snapshot valide', () => {
    const snap = baseSnapshot()
    expect(parseSnapshot(serializeSnapshot(snap)).project.id).toBe('p1')
  })

  it('rejette un mauvais format', () => {
    expect(() => parseSnapshot(JSON.stringify({ format: 'autre' }))).toThrow(/non reconnu/)
  })

  it('rejette un JSON illisible', () => {
    expect(() => parseSnapshot('{oops')).toThrow(/illisible/)
  })
})

describe('mergeSnapshots', () => {
  it('garde l\'entité la plus récente et fait l\'union', () => {
    const local = baseSnapshot({
      characters: [
        { id: 'c1', projectId: 'p1', firstName: 'Ana', lastName: 'A', nickname: '', birthDate: '', manualAge: null, role: '', tags: [], metadata: [], description: '', portrait: '', createdAt: 1, updatedAt: 10 },
        { id: 'c2', projectId: 'p1', firstName: 'Bob', lastName: '', nickname: '', birthDate: '', manualAge: null, role: '', tags: [], metadata: [], description: '', portrait: '', createdAt: 1, updatedAt: 5 },
      ],
    })
    const remote = baseSnapshot({
      project: project({ updatedAt: 20 }),
      characters: [
        { id: 'c1', projectId: 'p1', firstName: 'Anaïs', lastName: 'A', nickname: '', birthDate: '', manualAge: null, role: '', tags: [], metadata: [], description: '', portrait: '', createdAt: 1, updatedAt: 30 },
        { id: 'c3', projectId: 'p1', firstName: 'Chloé', lastName: '', nickname: '', birthDate: '', manualAge: null, role: '', tags: [], metadata: [], description: '', portrait: '', createdAt: 1, updatedAt: 3 },
      ],
    })
    const merged = mergeSnapshots(local, remote)
    expect(merged.project.updatedAt).toBe(20)
    const c1 = merged.characters.find((c) => c.id === 'c1')
    expect(c1?.firstName).toBe('Anaïs') // remote plus récent
    expect(merged.characters.find((c) => c.id === 'c2')?.firstName).toBe('Bob') // local seul
    expect(merged.characters.find((c) => c.id === 'c3')).toBeDefined() // remote seul
    expect(merged.characters).toHaveLength(3)
  })
})

describe('remapSnapshotIds', () => {
  it('recopie le snapshot avec de nouveaux ids et références cohérentes', () => {
    const snap = baseSnapshot({
      characters: [
        { id: 'c1', projectId: 'p1', firstName: 'Ana', lastName: '', nickname: '', birthDate: '', manualAge: null, role: '', tags: [], metadata: [], description: '', portrait: '', createdAt: 1, updatedAt: 1 },
        { id: 'c2', projectId: 'p1', firstName: 'Bob', lastName: '', nickname: '', birthDate: '', manualAge: null, role: '', tags: [], metadata: [], description: '', portrait: '', createdAt: 1, updatedAt: 1 },
      ],
      relationships: [
        { id: 'r1', projectId: 'p1', sourceId: 'c1', targetId: 'c2', type: 'friend', label: '', createdAt: 1, updatedAt: 1 },
      ],
      dialogueScenes: [
        {
          id: 's1',
          projectId: 'p1',
          title: 'Scène 1',
          description: '',
          plotId: 'pl1',
          lines: [
            { id: 'l1', characterId: 'c1', text: 'Salut' },
            { id: 'l2', characterId: '', text: 'Il entra.' },
          ],
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      novels: [{ id: 'n1', projectId: 'p1', title: 'Roman', createdAt: 1, updatedAt: 1 }],
      chapters: [{ id: 'ch1', projectId: 'p1', novelId: 'n1', title: 'Chapitre 1', content: '<p>x</p>', order: 0, createdAt: 1, updatedAt: 1 }],
      plots: [{ id: 'pl1', projectId: 'p1', title: 'Intrigue', synopsis: '', status: 'idea', tags: [], characterIds: ['c2'], createdAt: 1, updatedAt: 1 }],
      wiki: [{ id: 'w1', projectId: 'p1', title: 'Aubeval', content: '<p>Le royaume…</p>', createdAt: 1, updatedAt: 1 }],
    })
    const copy = remapSnapshotIds(snap, 'p2', 999)
    expect(copy.project.id).toBe('p2')
    expect(copy.characters.every((c) => c.projectId === 'p2' && c.id !== 'c1')).toBe(true)
    const c1new = copy.characters.find((c) => c.firstName === 'Ana')!
    const c2new = copy.characters.find((c) => c.firstName === 'Bob')!
    const pl1new = copy.plots[0].id
    expect(copy.relationships[0].sourceId).toBe(c1new.id)
    expect(copy.relationships[0].targetId).toBe(c2new.id)
    expect(copy.dialogueScenes[0].lines[0].characterId).toBe(c1new.id)
    expect(copy.dialogueScenes[0].lines[1].characterId).toBe('') // narrateur inchangé
    expect(copy.dialogueScenes[0].plotId).toBe(pl1new)
    expect(copy.novels[0].projectId).toBe('p2')
    expect(copy.chapters[0].novelId).toBe(copy.novels[0].id)
    expect(copy.plots[0].characterIds).toEqual([c2new.id])
    expect(copy.wiki[0].projectId).toBe('p2')
    expect(copy.wiki[0].id).not.toBe('w1')
  })

  it('normalise un vieux snapshot sans romans (v1) en créant un roman par défaut', () => {
    const old = baseSnapshot({
      version: 1,
      chapters: [{ id: 'ch1', projectId: 'p1', title: 'C1', content: '', order: 0, createdAt: 1, updatedAt: 1 } as never],
    })
    delete (old as Partial<ProjectSnapshot>).novels
    const parsed = parseSnapshot(serializeSnapshot(old))
    expect(parsed.novels).toHaveLength(1)
    expect(parsed.novels[0].title).toBe('Roman')
    expect(parsed.chapters[0].novelId).toBe(parsed.novels[0].id)
  })
})
