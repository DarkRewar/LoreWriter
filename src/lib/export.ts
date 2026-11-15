import { db } from '../db'
import { parseSnapshot, serializeSnapshot, type ProjectSnapshot } from './snapshot'

export { parseSnapshot, serializeSnapshot }
export type { ProjectSnapshot }

export async function buildSnapshot(projectId: string): Promise<ProjectSnapshot> {
  const project = await db.projects.get(projectId)
  if (!project) throw new Error(`Projet introuvable : ${projectId}`)
  const [characters, relationships, dialogueScenes, chapters, plots] = await Promise.all([
    db.characters.where('projectId').equals(projectId).toArray(),
    db.relationships.where('projectId').equals(projectId).toArray(),
    db.dialogueScenes.where('projectId').equals(projectId).toArray(),
    db.chapters.where('projectId').equals(projectId).toArray(),
    db.plots.where('projectId').equals(projectId).toArray(),
  ])
  return {
    format: 'lorewriter-snapshot',
    version: 1,
    exportedAt: Date.now(),
    project,
    characters,
    relationships,
    dialogueScenes,
    chapters,
    plots,
  }
}

/** Écrit un snapshot dans la base (mode 'replace' : remplace tout le projet). */
export async function applySnapshot(snapshot: ProjectSnapshot, mode: 'replace' | 'merge' = 'replace'): Promise<string> {
  const pid = snapshot.project.id
  await db.transaction(
    'rw',
    [db.projects, db.characters, db.relationships, db.dialogueScenes, db.chapters, db.plots],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.characters.where('projectId').equals(pid).delete(),
          db.relationships.where('projectId').equals(pid).delete(),
          db.dialogueScenes.where('projectId').equals(pid).delete(),
          db.chapters.where('projectId').equals(pid).delete(),
          db.plots.where('projectId').equals(pid).delete(),
        ])
      }
      await db.projects.put(snapshot.project)
      if (snapshot.characters.length) await db.characters.bulkPut(snapshot.characters)
      if (snapshot.relationships.length) await db.relationships.bulkPut(snapshot.relationships)
      if (snapshot.dialogueScenes.length) await db.dialogueScenes.bulkPut(snapshot.dialogueScenes)
      if (snapshot.chapters.length) await db.chapters.bulkPut(snapshot.chapters)
      if (snapshot.plots.length) await db.plots.bulkPut(snapshot.plots)
    },
  )
  return pid
}
