import { describe, expect, it } from 'vitest'
import {
  BASE_FILE_NAME,
  chapterFileName,
  dialogueFileName,
  projectFilesToSnapshot,
  snapshotToProjectFiles,
  wikiFileName,
} from './projectFiles'
import { parseSnapshot, SNAPSHOT_FORMAT, type ProjectSnapshot } from './snapshot'
import type { Chapter, DialogueScene, Project } from '../types'

const project = (over: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Mon histoire',
  description: '',
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

const chapter = (over: Partial<Chapter> = {}): Chapter => ({
  id: 'ch1',
  projectId: 'p1',
  novelId: 'n1',
  title: 'Chapitre 1',
  content: '<p>Il était <strong>une fois</strong>.</p>',
  order: 0,
  createdAt: 1,
  updatedAt: 10,
  ...over,
})

const scene = (over: Partial<DialogueScene> = {}): DialogueScene => ({
  id: 's1',
  projectId: 'p1',
  title: 'La cave',
  description: '',
  plotId: 'pl1',
  lines: [{ id: 'l1', characterId: 'c1', text: 'Salut.' }],
  createdAt: 1,
  updatedAt: 5,
  ...over,
})

const snap = (over: Partial<ProjectSnapshot> = {}): ProjectSnapshot => ({
  format: SNAPSHOT_FORMAT,
  version: 1,
  exportedAt: 1,
  project: project(),
  characters: [],
  relationships: [],
  dialogueScenes: [scene()],
  novels: [{ id: 'n1', projectId: 'p1', title: 'Roman', createdAt: 1, updatedAt: 1 }],
  chapters: [chapter()],
  plots: [{ id: 'pl1', projectId: 'p1', title: 'Intrigue', synopsis: '', status: 'idea', tags: [], characterIds: ['c1'], createdAt: 1, updatedAt: 1 }],
  wiki: [{ id: 'w1', projectId: 'p1', title: 'Aubeval', content: '<p>Royaume fortifié.</p>', createdAt: 1, updatedAt: 5 }],
  ...over,
})

describe('snapshotToProjectFiles / projectFilesToSnapshot', () => {
  it('produit un fichier de base + un .md par chapitre + un .json par dialogue', () => {
    const files = snapshotToProjectFiles(snap({ chapters: [chapter(), chapter({ id: 'ch2', order: 1 })] }))
    expect([...files.keys()].sort()).toEqual([BASE_FILE_NAME, chapterFileName('ch1'), chapterFileName('ch2'), dialogueFileName('s1'), wikiFileName('w1')].sort())
    expect(files.get(chapterFileName('ch1'))).toContain('**une fois**')
    expect(files.get(dialogueFileName('s1'))).toContain('"plotId": "pl1"')
    const base = parseSnapshot(files.get(BASE_FILE_NAME)!)
    expect(base.chapters).toEqual([])
    expect(base.dialogueScenes).toEqual([])
    expect(base.plots).toHaveLength(1)
  })

  it('reassemble un snapshot fidèle (aller-retour)', () => {
    const original = snap()
    const back = projectFilesToSnapshot(snapshotToProjectFiles(original))
    expect(back).toEqual(original)
    expect(back.chapters[0].title).toBe('Chapitre 1')
    expect(back.chapters[0].content).toContain('<strong>une fois</strong>')
    expect(back.dialogueScenes[0].plotId).toBe('pl1')
    expect(back.dialogueScenes[0].lines[0].text).toBe('Salut.')
  })

  it('accepte aussi un simple objet chemin -> contenu', () => {
    const files = Object.fromEntries(snapshotToProjectFiles(snap()))
    const back = projectFilesToSnapshot(files)
    expect(back.chapters).toHaveLength(1)
    expect(back.dialogueScenes).toHaveLength(1)
  })

  it('rejette un ensemble de fichiers sans fichier de base', () => {
    expect(() => projectFilesToSnapshot(new Map([[chapterFileName('ch1'), '---\nid: "ch1"\n---\n\nx']]))).toThrow(/project\.json/)
  })
})
