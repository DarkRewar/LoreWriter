import { describe, expect, it } from 'vitest'
import { looksLikeLoreFile, loreBytesToProjectFiles, loreBytesToSnapshot, projectFilesToLoreBytes, snapshotToLoreBytes } from './lore'
import { projectFilesToSnapshot, snapshotToProjectFiles } from './projectFiles'
import { SNAPSHOT_FORMAT, type ProjectSnapshot } from './snapshot'
import { htmlToMarkdown } from './markdown'
import type { Chapter, DialogueScene, Project } from '../types'

const norm = (s: ProjectSnapshot): ProjectSnapshot => ({
  ...s,
  chapters: s.chapters.map((c) => ({ ...c, content: htmlToMarkdown(c.content) })),
})

const project = (over: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Mon histoire',
  description: '',
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

const snap = (over: Partial<ProjectSnapshot> = {}): ProjectSnapshot => ({
  format: SNAPSHOT_FORMAT,
  version: 1,
  exportedAt: 1,
  project: project(),
  characters: [],
  relationships: [],
  dialogueScenes: [
    {
      id: 's1',
      projectId: 'p1',
      title: 'La cave',
      description: '',
      plotId: 'pl1',
      lines: [{ id: 'l1', characterId: 'c1', text: 'Salut.' }],
      createdAt: 1,
      updatedAt: 5,
    } as DialogueScene,
  ],
  novels: [{ id: 'n1', projectId: 'p1', title: 'Roman', createdAt: 1, updatedAt: 1 }],
  chapters: [
    {
      id: 'ch1',
      projectId: 'p1',
      novelId: 'n1',
      title: 'Chapitre 1 : l’été',
      content: '<h2>Départ</h2><p>Elle <strong>partit</strong> à l’aube.</p>',
      order: 0,
      createdAt: 1,
      updatedAt: 10,
    } as Chapter,
  ],
  plots: [{ id: 'pl1', projectId: 'p1', title: 'Intrigue', synopsis: '', status: 'idea', tags: [], characterIds: ['c1'], createdAt: 1, updatedAt: 1 }],
  ...over,
})

describe('fichier .lore (archive ZIP multi-fichiers)', () => {
  it('snapshot -> .lore -> snapshot est fidèle (aller-retour)', async () => {
    const original = snap()
    const bytes = await snapshotToLoreBytes(original)
    expect(bytes[0]).toBe(0x50)
    expect(bytes[1]).toBe(0x4b)
    const back = await loreBytesToSnapshot(bytes)
    expect(norm(back)).toEqual(norm(original))
  })

  it('le .lore contient bien project.json + chapters/*.md + dialogues/*.json', async () => {
    const bytes = await snapshotToLoreBytes(snap())
    const raw = await loreBytesToProjectFiles(bytes)
    expect([...raw.keys()].sort()).toEqual(['chapters/ch1.md', 'dialogues/s1.json', 'project.json'])
    const back = projectFilesToSnapshot(raw)
    expect(back.chapters).toHaveLength(1)
    expect(back.dialogueScenes).toHaveLength(1)
  })

  it('projectFiles -> .lore -> projectFiles est fidèle', async () => {
    const files = snapshotToProjectFiles(snap())
    const bytes = await projectFilesToLoreBytes(files)
    const back = projectFilesToSnapshot(await loreBytesToProjectFiles(bytes))
    expect(norm(back)).toEqual(norm(snap()))
  })

  it('rejette un fichier qui n\'est pas une archive', async () => {
    await expect(loreBytesToSnapshot(new TextEncoder().encode('pas un zip'))).rejects.toThrow()
  })
})

describe('looksLikeLoreFile', () => {
  it('détecte par extension ou par signature PK', () => {
    expect(looksLikeLoreFile('mon-projet.lore', new Uint8Array(0))).toBe(true)
    expect(looksLikeLoreFile('archive.zip', new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0]))).toBe(true)
    expect(looksLikeLoreFile('data.json', new TextEncoder().encode('{"a":1}'))).toBe(false)
  })
})
