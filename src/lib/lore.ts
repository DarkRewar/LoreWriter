import { createZip, extractZip } from './archive'
import { projectFilesToSnapshot, snapshotToProjectFiles, type ProjectFiles } from './projectFiles'
import type { ProjectSnapshot } from './export'

/**
 * Le fichier `.lore` est l'export d'un projet en UN SEUL fichier :
 * une archive ZIP contenant la sauvegarde multi-fichiers du projet
 * (`project.json` + `chapters/<id>.md` + `dialogues/<id>.json`).
 */

export const LORE_EXTENSION = '.lore'
export const LORE_MIME = 'application/zip'

/** Empaquette les fichiers d'un projet dans une archive .lore (ZIP). */
export async function projectFilesToLoreBytes(files: ProjectFiles | Record<string, string>): Promise<Uint8Array> {
  const entries = files instanceof Map ? [...files.entries()] : Object.entries(files)
  return createZip(entries.map(([name, content]) => ({ name, content })))
}

/** Snapshot complet -> archive .lore (ZIP des fichiers du projet). */
export async function snapshotToLoreBytes(snap: ProjectSnapshot): Promise<Uint8Array> {
  return projectFilesToLoreBytes(snapshotToProjectFiles(snap))
}

/** Archive .lore (ZIP) -> fichiers du projet (chemin -> contenu texte). */
export async function loreBytesToProjectFiles(bytes: Uint8Array): Promise<ProjectFiles> {
  const decoder = new TextDecoder()
  const files: ProjectFiles = new Map()
  for (const e of await extractZip(bytes)) files.set(e.name, decoder.decode(e.content))
  return files
}

/** Archive .lore (ZIP) -> snapshot complet du projet. */
export async function loreBytesToSnapshot(bytes: Uint8Array): Promise<ProjectSnapshot> {
  return projectFilesToSnapshot(await loreBytesToProjectFiles(bytes))
}

/** Détecte un fichier .lore (extension ou signature ZIP « PK »). */
export function looksLikeLoreFile(name: string, bytes: Uint8Array): boolean {
  if (name.toLowerCase().endsWith(LORE_EXTENSION)) return true
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
}
