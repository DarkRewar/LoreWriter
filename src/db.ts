import Dexie, { type Table } from 'dexie'
import type { Chapter, Character, DialogueScene, Novel, Plot, Project, Relationship, WikiEntry } from './types'
import { newId } from './lib/ids'

export class LoreWriterDB extends Dexie {
  projects!: Table<Project, string>
  characters!: Table<Character, string>
  relationships!: Table<Relationship, string>
  dialogueScenes!: Table<DialogueScene, string>
  novels!: Table<Novel, string>
  chapters!: Table<Chapter, string>
  plots!: Table<Plot, string>
  wikiEntries!: Table<WikiEntry, string>

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
    this.version(3)
      .stores({
        novels: 'id, projectId, title, updatedAt',
        chapters: 'id, projectId, novelId, order, updatedAt',
      })
      .upgrade(async (tx) => {
        const projects = await tx.table('projects').toArray()
        const novels = tx.table('novels')
        const chapters = tx.table('chapters')
        for (const p of projects) {
          const novelId = newId()
          await novels.add({ id: novelId, projectId: p.id, title: 'Roman', createdAt: p.createdAt, updatedAt: p.updatedAt })
          await chapters.where('projectId').equals(p.id).modify((c) => {
            if (!c.novelId) c.novelId = novelId
          })
        }
      })
    this.version(4).stores({
      wikiEntries: 'id, projectId, title, updatedAt',
    })
  }
}

export const db = new LoreWriterDB()
