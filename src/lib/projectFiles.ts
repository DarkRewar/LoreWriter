import type { Chapter, DialogueScene, WikiEntry } from '../types'
import { buildSnapshot, parseSnapshot, serializeSnapshot, type ProjectSnapshot } from './export'
import { parseChapterFile, parseWikiFile, serializeChapterFile, serializeWikiFile } from './markdown'

/**
 * Sauvegarde d'un projet en plusieurs fichiers :
 * - `project.json`        : fichier de base (projet, personnages, relations, intrigues)
 * - `chapters/<id>.md`    : un fichier Markdown dédié par chapitre (frontmatter + contenu)
 * - `dialogues/<id>.json` : un fichier JSON dédié par scène de dialogue
 * - `wiki/<id>.md`        : un fichier Markdown dédié par entrée de wiki
 */

export const BASE_FILE_NAME = 'project.json'
export const CHAPTERS_DIR = 'chapters'
export const DIALOGUES_DIR = 'dialogues'
export const WIKI_DIR = 'wiki'

export type ProjectFiles = Map<string, string>

export function chapterFileName(chapterId: string): string {
  return `${CHAPTERS_DIR}/${chapterId}.md`
}

export function dialogueFileName(sceneId: string): string {
  return `${DIALOGUES_DIR}/${sceneId}.json`
}

export function wikiFileName(entryId: string): string {
  return `${WIKI_DIR}/${entryId}.md`
}

/** Découpe un snapshot complet en fichiers (chemin relatif -> contenu). */
export function snapshotToProjectFiles(snap: ProjectSnapshot): ProjectFiles {
  const files: ProjectFiles = new Map()
  files.set(BASE_FILE_NAME, serializeSnapshot({ ...snap, chapters: [], dialogueScenes: [], wiki: [] }))
  for (const ch of snap.chapters) files.set(chapterFileName(ch.id), serializeChapterFile(ch))
  for (const sc of snap.dialogueScenes) files.set(dialogueFileName(sc.id), JSON.stringify(sc, null, 2))
  for (const w of snap.wiki ?? []) files.set(wikiFileName(w.id), serializeWikiFile(w))
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
  const wiki: WikiEntry[] = []
  for (const [path, content] of entries) {
    if (path === BASE_FILE_NAME) continue
    if (path.startsWith(`${CHAPTERS_DIR}/`) && path.endsWith('.md')) chapters.push(parseChapterFile(content))
    else if (path.startsWith(`${DIALOGUES_DIR}/`) && path.endsWith('.json')) dialogueScenes.push(parseDialogueFile(content))
    else if (path.startsWith(`${WIKI_DIR}/`) && path.endsWith('.md')) wiki.push(parseWikiFile(content))
  }
  return { ...base, chapters, dialogueScenes, wiki }
}
