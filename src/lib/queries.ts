import { db } from '../db'
import { buildSnapshot, applySnapshot, type ProjectSnapshot } from './export'
import { remapSnapshotIds } from './snapshot'
import { newId } from './ids'
import { searchEntities, type SearchResult } from './search'
import { loreBytesToSnapshot, snapshotToLoreBytes } from './lore'

export async function createProject(name: string, description: string): Promise<string> {
  const now = Date.now()
  const id = newId()
  await db.projects.add({ id, name, description, createdAt: now, updatedAt: now })
  return id
}

export async function touchProject(projectId: string): Promise<void> {
  await db.projects.update(projectId, { updatedAt: Date.now() })
}

export async function deleteProject(projectId: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.projects, db.characters, db.relationships, db.dialogueScenes, db.novels, db.chapters, db.plots],
    async () => {
      await db.projects.delete(projectId)
      await Promise.all([
        db.characters.where('projectId').equals(projectId).delete(),
        db.relationships.where('projectId').equals(projectId).delete(),
        db.dialogueScenes.where('projectId').equals(projectId).delete(),
        db.novels.where('projectId').equals(projectId).delete(),
        db.chapters.where('projectId').equals(projectId).delete(),
        db.plots.where('projectId').equals(projectId).delete(),
      ])
    },
  )
}

export async function duplicateProject(projectId: string): Promise<string> {
  const snap = await buildSnapshot(projectId)
  const copy = remapSnapshotIds(snap, newId())
  copy.project.name = `${snap.project.name} (copie)`
  await applySnapshot(copy, 'replace')
  return copy.project.id
}

async function importSnapshot(snap: ProjectSnapshot): Promise<string> {
  const exists = await db.projects.get(snap.project.id)
  const finalSnap = exists ? remapSnapshotIds(snap, newId()) : snap
  if (exists) finalSnap.project.name = `${snap.project.name} (import)`
  await applySnapshot(finalSnap, 'replace')
  return finalSnap.project.id
}

/** Export en UN SEUL fichier .lore : archive ZIP contenant project.json + chapters/*.md + dialogues/*.json. */
export async function exportProjectLore(projectId: string): Promise<Uint8Array> {
  return snapshotToLoreBytes(await buildSnapshot(projectId))
}

/** Importe un fichier .lore (archive ZIP multi-fichiers). */
export async function importProjectLore(bytes: Uint8Array): Promise<string> {
  return importSnapshot(await loreBytesToSnapshot(bytes))
}

export async function searchProject(projectId: string, query: string): Promise<SearchResult[]> {
  const [characters, relationships, dialogueScenes, novels, chapters, plots] = await Promise.all([
    db.characters.where('projectId').equals(projectId).toArray(),
    db.relationships.where('projectId').equals(projectId).toArray(),
    db.dialogueScenes.where('projectId').equals(projectId).toArray(),
    db.novels.where('projectId').equals(projectId).toArray(),
    db.chapters.where('projectId').equals(projectId).toArray(),
    db.plots.where('projectId').equals(projectId).toArray(),
  ])
  return searchEntities({ projectId, characters, relationships, dialogueScenes, novels, chapters, plots }, query)
}

export function downloadFile(filename: string, content: string | Uint8Array, type = 'application/octet-stream'): void {
  const blob = new Blob([content as BlobPart], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
