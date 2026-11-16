import Dexie, { type Table } from 'dexie'
import type { Chapter, Character, DialogueScene, Plot, Project, Relationship } from './types'

export class LoreWriterDB extends Dexie {
  projects!: Table<Project, string>
  characters!: Table<Character, string>
  relationships!: Table<Relationship, string>
  dialogueScenes!: Table<DialogueScene, string>
  chapters!: Table<Chapter, string>
  plots!: Table<Plot, string>

  constructor() {
    super('lorewriter')
    this.version(1).stores({
      projects: 'id, name, updatedAt',
      characters: 'id, projectId, lastName, firstName, updatedAt',
      relationships: 'id, projectId, sourceId, targetId, type',
      dialogueScenes: 'id, projectId, title, updatedAt',
      chapters: 'id, projectId, order, updatedAt',
      plots: 'id, projectId, title, status, updatedAt',
    })
    this.version(2)
      .stores({
        dialogueScenes: 'id, projectId, title, plotId, updatedAt',
      })
      .upgrade((tx) =>
        tx
          .table('dialogueScenes')
          .toCollection()
          .modify((s) => {
            if (!s.plotId) s.plotId = ''
          }),
      )
  }
}

export const db = new LoreWriterDB()
