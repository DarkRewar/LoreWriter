import { applySnapshot, buildSnapshot, parseSnapshot, serializeSnapshot, type ProjectSnapshot } from './export'
import { tombstonedIds } from './tombstones'
import { mergeSnapshots } from './snapshot'
import {
  BASE_FILE_NAME,
  CHAPTERS_DIR,
  DIALOGUES_DIR,
  WIKI_DIR,
  projectFilesToSnapshot,
  snapshotToProjectFiles,
  type ProjectFiles,
} from './projectFiles'

export type BackupMode = 'off' | 'each-sync' | 'daily'

export interface CloudConfig {
  provider: 'webdav'
  /** URL de base WebDAV, ex. https://cloud.example.com/remote.php/dav/files/alice */
  baseUrl: string
  username: string
  /** Mot de passe d'application (recommandé) ou mot de passe du compte. */
  password: string
  /** Dossier distant, ex. LoreWriter */
  folder: string
  enabled: boolean
  /** Sauvegarde .lore automatique après une synchro réussie ('off' par défaut). */
  backupMode?: BackupMode
  /** Dossier de sauvegarde choisi dans l'app desktop (sinon boîte de dialogue / téléchargement). */
  backupDir?: string
}

const STORAGE_KEY = 'lorewriter:cloud:v1'

export function loadCloudConfig(): CloudConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CloudConfig) : null
  } catch {
    return null
  }
}

export function saveCloudConfig(c: CloudConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c))
}

export function clearCloudConfig(): void {
  localStorage.removeItem(STORAGE_KEY)
}

const lastBackupKey = (projectId: string) => `lorewriter:backup:last:${projectId}`

/** Date de la dernière sauvegarde .lore automatique du projet (null si jamais). */
export function lastBackupAt(projectId: string): number | null {
  try {
    const raw = localStorage.getItem(lastBackupKey(projectId))
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export function markBackupDone(projectId: string, at = Date.now()): void {
  try {
    localStorage.setItem(lastBackupKey(projectId), String(at))
  } catch {
    /* stockage indisponible : on ignore */
  }
}

/** Décide si une sauvegarde .lore doit être faite après une synchro réussie. */
export function shouldBackupNow(cfg: CloudConfig, projectId: string, now = Date.now()): boolean {
  const mode = cfg.backupMode ?? 'off'
  if (!cfg.enabled || mode === 'off') return false
  if (mode === 'each-sync') return true
  const last = lastBackupAt(projectId)
  return last === null || now - last >= 24 * 60 * 60 * 1000
}

export function b64encodeUnicode(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

const authHeader = (c: CloudConfig): Record<string, string> => ({
  Authorization: `Basic ${b64encodeUnicode(`${c.username}:${c.password}`)}`,
})

function cloudUrl(config: CloudConfig, ...segments: string[]): string {
  const base = config.baseUrl.replace(/\/+$/, '')
  const folder = config.folder.replace(/^\/+|\/+$/g, '')
  const parts = [...(folder ? folder.split('/') : []), 'lorewriter', ...segments]
  return `${base}/${parts.map(encodeURIComponent).join('/')}`
}

/** Ancien emplacement (v1) : un seul fichier JSON par projet — encore lu pour migrer. */
export function cloudFilePath(config: CloudConfig, projectId: string): string {
  return cloudUrl(config, `${projectId}.json`)
}

/** Dossier d'un projet en multi-fichiers : `<base>/<dossier>/lorewriter/<id-projet>/`. */
export function cloudProjectDirUrl(config: CloudConfig, projectId: string): string {
  return `${cloudUrl(config, projectId)}/`
}

/** Fichier de base du projet (projet, personnages, relations, intrigues). */
export function cloudBaseFileUrl(config: CloudConfig, projectId: string): string {
  return cloudUrl(config, projectId, BASE_FILE_NAME)
}

export function cloudChaptersDirUrl(config: CloudConfig, projectId: string): string {
  return `${cloudUrl(config, projectId, CHAPTERS_DIR)}/`
}

export function cloudDialoguesDirUrl(config: CloudConfig, projectId: string): string {
  return `${cloudUrl(config, projectId, DIALOGUES_DIR)}/`
}

export function cloudChapterFileUrl(config: CloudConfig, projectId: string, chapterId: string): string {
  return cloudUrl(config, projectId, CHAPTERS_DIR, `${chapterId}.md`)
}

export function cloudDialogueFileUrl(config: CloudConfig, projectId: string, sceneId: string): string {
  return cloudUrl(config, projectId, DIALOGUES_DIR, `${sceneId}.json`)
}

export function cloudWikiDirUrl(config: CloudConfig, projectId: string): string {
  return `${cloudUrl(config, projectId, WIKI_DIR)}/`
}

export function cloudWikiFileUrl(config: CloudConfig, projectId: string, entryId: string): string {
  return cloudUrl(config, projectId, WIKI_DIR, `${entryId}.md`)
}

/** Dossier racine contenant un sous-dossier par projet : `<base>/<folder>/lorewriter/`. */
export function cloudProjectsDirUrl(config: CloudConfig): string {
  return `${cloudUrl(config)}/`
}

async function ensureCollections(config: CloudConfig, fileUrl: string): Promise<void> {
  const base = config.baseUrl.replace(/\/+$/, '')
  if (!fileUrl.startsWith(base + '/')) return
  const segments = fileUrl.slice(base.length + 1).split('/')
  let current = base
  for (let i = 0; i < segments.length - 1; i++) {
    current += '/' + segments[i]
    try {
      await fetch(`${current}/`, { method: 'MKCOL', headers: authHeader(config) })
    } catch {
      // réseau indisponible : le PUT final remontera l'erreur
    }
  }
}

async function fetchText(config: CloudConfig, url: string): Promise<string | null> {
  const res = await fetch(url, { method: 'GET', headers: authHeader(config) })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Échec du téléchargement depuis le cloud (HTTP ${res.status})`)
  return await res.text()
}

async function putText(config: CloudConfig, url: string, content: string, contentType: string): Promise<void> {
  await ensureCollections(config, url)
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...authHeader(config), 'Content-Type': contentType },
    body: content,
  })
  if (!res.ok) throw new Error(`Échec de l'envoi vers le cloud (HTTP ${res.status})`)
}

async function deleteRemote(config: CloudConfig, url: string): Promise<void> {
  const res = await fetch(url, { method: 'DELETE', headers: authHeader(config) })
  if (!res.ok && res.status !== 404) throw new Error(`Échec de la suppression distante (HTTP ${res.status})`)
}

/**
 * Extrait les noms des fichiers enfants d'une collection WebDAV depuis une
 * réponse PROPFIND (multistatus), relativement à l'URL du dossier listé.
 */
function parsePropfindChildren(xml: string, dirUrl: string): string[] {
  const hrefs = [...xml.matchAll(/<(?:[a-zA-Z][\w.-]*:)?href[^>]*>([^<]+)<\/(?:[a-zA-Z][\w.-]*:)?href>/gi)].map((m) => m[1])
  let dirPath: string
  try {
    dirPath = new URL(dirUrl).pathname.replace(/\/+$/, '') + '/'
  } catch {
    return []
  }
  const out: string[] = []
  for (const raw of hrefs) {
    let path = raw
    if (/^https?:\/\//i.test(raw)) {
      try {
        path = new URL(raw).pathname
      } catch {
        continue
      }
    }
    let decoded = path
    try {
      decoded = decodeURIComponent(path)
    } catch {
      // garde le chemin tel quel
    }
    if (decoded.startsWith(dirPath)) {
      const child = decoded.slice(dirPath.length)
      if (child) out.push(child)
    }
  }
  return [...new Set(out)]
}

/** Enfants fichiers d'un dossier distant (les dossiers, terminés par « / », sont exclus). */
export function parsePropfindHrefs(xml: string, dirUrl: string): string[] {
  return parsePropfindChildren(xml, dirUrl).filter((c) => !c.endsWith('/'))
}

/** Enfants dossiers d'un dossier distant (sans le « / » final). */
export function parsePropfindDirs(xml: string, dirUrl: string): string[] {
  return parsePropfindChildren(xml, dirUrl)
    .filter((c) => c.endsWith('/'))
    .map((c) => c.slice(0, -1))
}

async function propfindDir(config: CloudConfig, dirUrl: string): Promise<string> {
  const res = await fetch(dirUrl, {
    method: 'PROPFIND',
    headers: { ...authHeader(config), Depth: '1', 'Content-Type': 'application/xml; charset=utf-8' },
    body: '<?xml version="1.0" encoding="utf-8"?><propfind xmlns="DAV:"><prop><resourcetype/></prop></propfind>',
  })
  if (res.status === 404) return ''
  if (!res.ok && res.status !== 207) throw new Error(`Échec du listage distant (HTTP ${res.status})`)
  return res.text()
}

/** Liste les fichiers d'un dossier distant WebDAV (PROPFIND Depth: 1). */
async function listRemoteFiles(config: CloudConfig, dirUrl: string): Promise<string[]> {
  return parsePropfindHrefs(await propfindDir(config, dirUrl), dirUrl)
}

/** Liste les sous-dossiers d'un dossier distant WebDAV (PROPFIND Depth: 1). */
async function listRemoteDirs(config: CloudConfig, dirUrl: string): Promise<string[]> {
  return parsePropfindDirs(await propfindDir(config, dirUrl), dirUrl)
}

export interface RemoteProjectInfo {
  id: string
  name: string
  updatedAt: number
}

/** Découvre les projets présents sur le serveur WebDAV (un dossier par projet sous lorewriter/). */
export async function listRemoteProjects(config: CloudConfig): Promise<RemoteProjectInfo[]> {
  const dirUrl = cloudProjectsDirUrl(config)
  const dirs = await listRemoteDirs(config, dirUrl)
  const deletedProjects = await tombstonedIds('*', 'project').catch(() => new Set<string>())
  const out: RemoteProjectInfo[] = []
  for (const id of dirs) {
    const base = await fetchText(config, `${dirUrl}${encodeURIComponent(id)}/${BASE_FILE_NAME}`)
    if (!base) continue
    try {
      const parsed = JSON.parse(base) as { project?: { id?: string; name?: string; updatedAt?: number } }
      const pid = parsed.project?.id ?? id
      if (deletedProjects.has(pid)) continue
      out.push({ id: pid, name: parsed.project?.name ?? id, updatedAt: parsed.project?.updatedAt ?? 0 })
    } catch {
      // project.json illisible : on ignore ce dossier
    }
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Télécharge un projet distant complet et l'importe en local. Retourne l'id du projet. */
export async function downloadRemoteProject(projectId: string, config?: CloudConfig | null): Promise<string> {
  const cfg = config === undefined ? loadCloudConfig() : config
  if (!cfg || !cfg.enabled) throw new Error('Synchronisation cloud non configurée ou désactivée.')
  const pulled = await pullProjectSnapshot(cfg, projectId)
  if (!pulled) throw new Error('Projet introuvable sur le serveur.')
  await applySnapshot(pulled.snapshot, 'replace')
  if (pulled.legacyUrl) await deleteRemote(cfg, pulled.legacyUrl)
  return pulled.snapshot.project.id
}

export interface SyncStatus {
  at: number
  projectId: string
  action: 'pushed' | 'pulled-merged' | 'up-to-date' | 'nothing-remote'
}

const lastSyncKey = (projectId: string) => `lorewriter:sync:last:${projectId}`

export function lastSyncStatus(projectId: string): SyncStatus | null {
  try {
    const raw = localStorage.getItem(lastSyncKey(projectId))
    return raw ? (JSON.parse(raw) as SyncStatus) : null
  } catch {
    return null
  }
}

/** Télécharge le projet distant en multi-fichiers (ou l'ancien fichier unique v1). */
async function pullProjectSnapshot(
  cfg: CloudConfig,
  projectId: string,
): Promise<{ snapshot: ProjectSnapshot; legacyUrl: string | null } | null> {
  const baseJson = await fetchText(cfg, cloudBaseFileUrl(cfg, projectId))
  if (baseJson) {
    const files: ProjectFiles = new Map([[BASE_FILE_NAME, baseJson]])
    const chaptersDir = cloudChaptersDirUrl(cfg, projectId)
    for (const name of (await listRemoteFiles(cfg, chaptersDir)).filter((n) => n.endsWith('.md'))) {
      const txt = await fetchText(cfg, `${chaptersDir}${encodeURIComponent(name)}`)
      if (txt) files.set(`${CHAPTERS_DIR}/${name}`, txt)
    }
    const dialoguesDir = cloudDialoguesDirUrl(cfg, projectId)
    for (const name of (await listRemoteFiles(cfg, dialoguesDir)).filter((n) => n.endsWith('.json'))) {
      const txt = await fetchText(cfg, `${dialoguesDir}${encodeURIComponent(name)}`)
      if (txt) files.set(`${DIALOGUES_DIR}/${name}`, txt)
    }
    const wikiDir = cloudWikiDirUrl(cfg, projectId)
    for (const name of (await listRemoteFiles(cfg, wikiDir)).filter((n) => n.endsWith('.md'))) {
      const txt = await fetchText(cfg, `${wikiDir}${encodeURIComponent(name)}`)
      if (txt) files.set(`${WIKI_DIR}/${name}`, txt)
    }
    return { snapshot: projectFilesToSnapshot(files), legacyUrl: null }
  }
  const legacyUrl = cloudFilePath(cfg, projectId)
  const legacyJson = await fetchText(cfg, legacyUrl)
  if (legacyJson) return { snapshot: parseSnapshot(legacyJson), legacyUrl }
  return null
}

/**
 * Synchronise un projet avec le cloud en plusieurs fichiers :
 * `<id-projet>/project.json` (base), `chapters/<id>.md` (un Markdown par
 * chapitre) et `dialogues/<id>.json` (un JSON par scène). Le snapshot distant
 * est fusionné entité par entité (la plus récente gagne), réappliqué en local
 * si besoin, puis renvoyé. L'ancien fichier unique `<id-projet>.json` (v1)
 * est automatiquement migré puis supprimé.
 */
export async function syncProjectWithCloud(projectId: string, config?: CloudConfig | null): Promise<SyncStatus> {
  const cfg = config === undefined ? loadCloudConfig() : config
  if (!cfg || !cfg.enabled) throw new Error('Synchronisation cloud non configurée ou désactivée.')
  const local = await buildSnapshot(projectId)
  const pulled = await pullProjectSnapshot(cfg, projectId)
  let snapshot: ProjectSnapshot = local
  let action: SyncStatus['action'] = 'pushed'
  if (pulled) {
    const merged = mergeSnapshots(local, pulled.snapshot)
    if (serializeSnapshot(merged) !== serializeSnapshot(local)) {
      await applySnapshot(merged, 'replace')
      snapshot = merged
      action = 'pulled-merged'
    } else {
      action = 'up-to-date'
    }
  } else {
    action = 'nothing-remote'
  }
  const files = snapshotToProjectFiles(snapshot)
  for (const [path, content] of files) {
    let url: string
    let type: string
    if (path === BASE_FILE_NAME) {
      url = cloudBaseFileUrl(cfg, projectId)
      type = 'application/json; charset=utf-8'
    } else if (path.startsWith(`${CHAPTERS_DIR}/`) && path.endsWith('.md')) {
      url = cloudChapterFileUrl(cfg, projectId, path.slice(CHAPTERS_DIR.length + 1, -'.md'.length))
      type = 'text/markdown; charset=utf-8'
    } else if (path.startsWith(`${WIKI_DIR}/`) && path.endsWith('.md')) {
      url = cloudWikiFileUrl(cfg, projectId, path.slice(WIKI_DIR.length + 1, -'.md'.length))
      type = 'text/markdown; charset=utf-8'
    } else {
      url = cloudDialogueFileUrl(cfg, projectId, path.slice(DIALOGUES_DIR.length + 1, -'.json'.length))
      type = 'application/json; charset=utf-8'
    }
    await putText(cfg, url, content, type)
  }
  for (const d of snapshot.deleted ?? []) {
    if (d.kind === 'chapter') await deleteRemote(cfg, cloudChapterFileUrl(cfg, projectId, d.id))
    else if (d.kind === 'dialogue') await deleteRemote(cfg, cloudDialogueFileUrl(cfg, projectId, d.id))
    else if (d.kind === 'wiki') await deleteRemote(cfg, cloudWikiFileUrl(cfg, projectId, d.id))
  }
  if (pulled?.legacyUrl) await deleteRemote(cfg, pulled.legacyUrl)
  const status: SyncStatus = { at: Date.now(), projectId, action }
  localStorage.setItem(lastSyncKey(projectId), JSON.stringify(status))
  return status
}
