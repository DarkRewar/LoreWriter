import type { Chapter, DialogueScene } from '../types'
import { buildSnapshot, parseSnapshot, serializeSnapshot, type ProjectSnapshot } from './export'
import { parseChapterFile, serializeChapterFile } from './markdown'

/**
 * Sauvegarde d'un projet en plusieurs fichiers :
 * - `project.json`        : fichier de base (projet, personnages, relations, intrigues)
 * - `chapters/<id>.md`    : un fichier Markdown dédié par chapitre (frontmatter + contenu)
 * - `dialogues/<id>.json` : un fichier JSON dédié par scène de dialogue
 */

export const BASE_FILE_NAME = 'project.json'
export const CHAPTERS_DIR = 'chapters'
export const DIALOGUES_DIR = 'dialogues'

export type ProjectFiles = Map<string, string>

export function chapterFileName(chapterId: string): string {
  return `${CHAPTERS_DIR}/${chapterId}.md`
}

export function dialogueFileName(sceneId: string): string {
  return `${DIALOGUES_DIR}/${sceneId}.json`
}

/** Découpe un snapshot complet en fichiers (chemin relatif -> contenu). */
export function snapshotToProjectFiles(snap: ProjectSnapshot): ProjectFiles {
  const files: ProjectFiles = new Map()
  files.set(BASE_FILE_NAME, serializeSnapshot({ ...snap, chapters: [], dialogueScenes: [] }))
  for (const ch of snap.chapters) files.set(chapterFileName(ch.id), serializeChapterFile(ch))
  for (const sc of snap.dialogueScenes) files.set(dialogueFileName(sc.id), JSON.stringify(sc, null, 2))
  return files
}

/** Construit les fichiers d'un projet depuis la base locale. */
export async function buildProjectFiles(projectId: string): Promise<ProjectFiles> {
  return snapshotToProjectFiles(await buildSnapshot(projectId))
}

function parseDialogueFile(json: string): DialogueScene {
  let d: Partial<DialogueScene>
  try {
    d = JSON.parse(json) as Partial<DialogueScene>
  } catch {
    throw new Error('Fichier de dialogue illisible (JSON invalide).')
  }
  if (!d || typeof d.id !== 'string' || typeof d.projectId !== 'string' || !Array.isArray(d.lines)) {
    throw new Error('Fichier de dialogue invalide.')
  }
  return {
    id: d.id,
    projectId: d.projectId,
    title: typeof d.title === 'string' ? d.title : '',
    description: typeof d.description === 'string' ? d.description : '',
    plotId: typeof d.plotId === 'string' ? d.plotId : '',
    lines: d.lines.map((l) => ({
      id: String(l.id ?? ''),
      characterId: String(l.characterId ?? ''),
      text: String(l.text ?? ''),
    })),
    createdAt: Number(d.createdAt) || 0,
    updatedAt: Number(d.updatedAt) || 0,
  }
}

/** Reassemble un snapshot complet depuis les fichiers d'un projet. */
export function projectFilesToSnapshot(files: ProjectFiles | Record<string, string>): ProjectSnapshot {
  const get = (path: string): string | undefined => (files instanceof Map ? files.get(path) : files[path])
  const baseJson = get(BASE_FILE_NAME)
  if (!baseJson) throw new Error(`Fichier de base « ${BASE_FILE_NAME} » manquant.`)
  const base = parseSnapshot(baseJson)
  const entries = files instanceof Map ? [...files.entries()] : Object.entries(files)
  const chapters: Chapter[] = []
  const dialogueScenes: DialogueScene[] = []
  for (const [path, content] of entries) {
    if (path === BASE_FILE_NAME) continue
    if (path.startsWith(`${CHAPTERS_DIR}/`) && path.endsWith('.md')) chapters.push(parseChapterFile(content))
    else if (path.startsWith(`${DIALOGUES_DIR}/`) && path.endsWith('.json')) dialogueScenes.push(parseDialogueFile(content))
  }
  return { ...base, chapters, dialogueScenes }
}
