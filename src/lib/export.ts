import { db } from '../db'
import { parseSnapshot, serializeSnapshot, SNAPSHOT_VERSION, type ProjectSnapshot } from './snapshot'

export { parseSnapshot, serializeSnapshot }
export type { ProjectSnapshot }

export async function buildSnapshot(projectId: string): Promise<ProjectSnapshot> {
  const project = await db.projects.get(projectId)
  if (!project) throw new Error(`Projet introuvable : ${projectId}`)
  const [characters, relationships, dialogueScenes, novels, chapters, plots, wiki] = await Promise.all([
    db.characters.where('projectId').equals(projectId).toArray(),
    db.relationships.where('projectId').equals(projectId).toArray(),
    db.dialogueScenes.where('projectId').equals(projectId).toArray(),
    db.novels.where('projectId').equals(projectId).toArray(),
    db.chapters.where('projectId').equals(projectId).toArray(),
    db.plots.where('projectId').equals(projectId).toArray(),
    db.wikiEntries.where('projectId').equals(projectId).toArray(),
  ])
  return {
    format: 'lorewriter-snapshot',
    version: SNAPSHOT_VERSION,
    exportedAt: Date.now(),
    project,
    characters,
    relationships,
    dialogueScenes,
    novels,
    chapters,
    plots,
    wiki,
  }
}

/** Écrit un snapshot dans la base (mode 'replace' : remplace tout le projet). */
export async function applySnapshot(snapshot: ProjectSnapshot, mode: 'replace' | 'merge' = 'replace'): Promise<string> {
  const pid = snapshot.project.id
  await db.transaction(
    'rw',
    [db.projects, db.characters, db.relationships, db.dialogueScenes, db.novels, db.chapters, db.plots, db.wikiEntries],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.characters.where('projectId').equals(pid).delete(),
          db.relationships.where('projectId').equals(pid).delete(),
          db.dialogueScenes.where('projectId').equals(pid).delete(),
          db.novels.where('projectId').equals(pid).delete(),
          db.chapters.where('projectId').equals(pid).delete(),
          db.plots.where('projectId').equals(pid).delete(),
          db.wikiEntries.where('projectId').equals(pid).delete(),
        ])
      }
      await db.projects.put(snapshot.project)
      if (snapshot.characters.length) await db.characters.bulkPut(snapshot.characters)
      if (snapshot.relationships.length) await db.relationships.bulkPut(snapshot.relationships)
      if (snapshot.dialogueScenes.length) await db.dialogueScenes.bulkPut(snapshot.dialogueScenes)
      if (snapshot.novels.length) await db.novels.bulkPut(snapshot.novels)
      if (snapshot.chapters.length) await db.chapters.bulkPut(snapshot.chapters)
      if (snapshot.plots.length) await db.plots.bulkPut(snapshot.plots)
      if (snapshot.wiki?.length) await db.wikiEntries.bulkPut(snapshot.wiki)
    },
  )
  return pid
}
