import type { Chapter, Character, DialogueScene, Novel, Plot, Project, Relationship, WikiEntry } from '../types'
import { newId } from './ids'

export const SNAPSHOT_FORMAT = 'lorewriter-snapshot'
export const SNAPSHOT_VERSION = 3

export interface ProjectSnapshot {
  format: typeof SNAPSHOT_FORMAT
  version: number
  exportedAt: number
  project: Project
  characters: Character[]
  relationships: Relationship[]
  dialogueScenes: DialogueScene[]
  novels: Novel[]
  chapters: Chapter[]
  plots: Plot[]
  wiki: WikiEntry[]
}

export function serializeSnapshot(s: ProjectSnapshot): string {
  return JSON.stringify(s, null, 2)
}

export function parseSnapshot(json: string): ProjectSnapshot {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('Fichier JSON illisible.')
  }
  const d = data as Record<string, unknown>
  if (!d || d.format !== SNAPSHOT_FORMAT) {
    throw new Error("Format de fichier non reconnu (attendu : snapshot LoreWriter).")
  }
  if (typeof d.version !== 'number' || d.version > SNAPSHOT_VERSION) {
    throw new Error(`Version de snapshot non supportée : ${String(d.version)}`)
  }
  const project = d.project as Project | undefined
  if (!project || typeof project.id !== 'string' || typeof project.name !== 'string') {
    throw new Error('Snapshot invalide : projet manquant.')
  }
  for (const key of ['characters', 'relationships', 'dialogueScenes', 'chapters', 'plots'] as const) {
    if (!Array.isArray(d[key])) throw new Error(`Snapshot invalide : « ${key} » manquant.`)
  }
  const snap = data as ProjectSnapshot
  snap.novels = Array.isArray(d.novels) ? (d.novels as Novel[]) : []
  return normalizeSnapshot(snap)
}

/** Normalise un snapshot : les chapitres sans roman sont rattachés à un roman « Roman » créé au besoin. */
export function normalizeSnapshot(snap: ProjectSnapshot): ProjectSnapshot {
  if (snap.chapters.every((c) => c.novelId)) return snap
  const now = Date.now()
  const novelId = newId()
  const fallback: Novel = { id: novelId, projectId: snap.project.id, title: 'Roman', createdAt: now, updatedAt: now }
  return {
    ...snap,
    novels: [...(snap.novels ?? []), fallback],
    chapters: snap.chapters.map((c) => ({ ...c, novelId: c.novelId || novelId })),
  }
}

type Entity = { id: string; updatedAt: number }

function mergeList<T extends Entity>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>()
  for (const e of local) byId.set(e.id, e)
  for (const e of remote) {
    const cur = byId.get(e.id)
    if (!cur || e.updatedAt >= cur.updatedAt) byId.set(e.id, e)
  }
  return [...byId.values()]
}

/** Fusionne deux snapshots entité par entité (la plus récente gagne). */
export function mergeSnapshots(local: ProjectSnapshot, remote: ProjectSnapshot): ProjectSnapshot {
  return {
    format: SNAPSHOT_FORMAT,
    version: SNAPSHOT_VERSION,
    exportedAt: Date.now(),
    project: remote.project.updatedAt >= local.project.updatedAt ? remote.project : local.project,
    characters: mergeList(local.characters, remote.characters),
    relationships: mergeList(local.relationships, remote.relationships),
    dialogueScenes: mergeList(local.dialogueScenes, remote.dialogueScenes),
    novels: mergeList(local.novels ?? [], remote.novels ?? []),
    chapters: mergeList(local.chapters, remote.chapters),
    plots: mergeList(local.plots, remote.plots),
    wiki: mergeList(local.wiki ?? [], remote.wiki ?? []),
  }
}

/** Recrée un snapshot avec de nouveaux identifiants (copie / import). */
export function remapSnapshotIds(s: ProjectSnapshot, newProjectId: string, now = Date.now()): ProjectSnapshot {
  const map = new Map<string, string>()
  const remap = (id: string): string => {
    if (!id) return ''
    let n = map.get(id)
    if (!n) {
      n = newId()
      map.set(id, n)
    }
    return n
  }
  return {
    ...s,
    exportedAt: now,
    project: { ...s.project, id: newProjectId, createdAt: now, updatedAt: now },
    characters: s.characters.map((c) => ({
      ...c,
      id: remap(c.id),
      projectId: newProjectId,
      createdAt: now,
      updatedAt: now,
    })),
    relationships: s.relationships.map((r) => ({
      ...r,
      id: remap(r.id),
      projectId: newProjectId,
      sourceId: remap(r.sourceId),
      targetId: remap(r.targetId),
      createdAt: now,
      updatedAt: now,
    })),
    dialogueScenes: s.dialogueScenes.map((sc) => ({
      ...sc,
      id: remap(sc.id),
      projectId: newProjectId,
      plotId: remap(sc.plotId ?? ''),
      lines: sc.lines.map((l) => ({ ...l, id: remap(l.id), characterId: remap(l.characterId) })),
      createdAt: now,
      updatedAt: now,
    })),
    novels: (s.novels ?? []).map((n) => ({
      ...n,
      id: remap(n.id),
      projectId: newProjectId,
      createdAt: now,
      updatedAt: now,
    })),
    chapters: s.chapters.map((c) => ({
      ...c,
      id: remap(c.id),
      projectId: newProjectId,
      novelId: remap(c.novelId ?? ''),
      createdAt: now,
      updatedAt: now,
    })),
    plots: s.plots.map((p) => ({
      ...p,
      id: remap(p.id),
      projectId: newProjectId,
      characterIds: p.characterIds.map((id) => remap(id)),
      createdAt: now,
      updatedAt: now,
    })),
    wiki: (s.wiki ?? []).map((w) => ({
      ...w,
      id: remap(w.id),
      projectId: newProjectId,
      createdAt: now,
      updatedAt: now,
    })),
  }
}
