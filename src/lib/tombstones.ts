import { db } from '../db'
import type { Deletion } from '../types'
import type { DeletedRef } from './snapshot'

/** Enregistre une trace de suppression (tombstone) pour une entité. */
export async function addTombstone(projectId: string, kind: string, entityId: string): Promise<void> {
  await db.deletions.put({ id: `${kind}:${entityId}`, projectId, kind, entityId, at: Date.now() })
}

/** Tombstones d'un projet, au format snapshot (`deleted`). */
export async function tombstonesFor(projectId: string): Promise<DeletedRef[]> {
  const rows = await db.deletions.where('projectId').equals(projectId).toArray()
  return rows.map((r: Deletion) => ({ kind: r.kind, id: r.entityId, at: r.at }))
}

/** ids d'entités supprimées pour un kind donné. */
export async function tombstonedIds(projectId: string, kind: string): Promise<Set<string>> {
  const rows = projectId === '*' ? await db.deletions.toArray() : await db.deletions.where('projectId').equals(projectId).toArray()
  return new Set(rows.filter((r) => r.kind === kind).map((r) => r.entityId))
}
