import { applySnapshot, buildSnapshot, parseSnapshot, serializeSnapshot, type ProjectSnapshot } from './export'
import { mergeSnapshots } from './snapshot'

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

export function b64encodeUnicode(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

const authHeader = (c: CloudConfig): Record<string, string> => ({
  Authorization: `Basic ${b64encodeUnicode(`${c.username}:${c.password}`)}`,
})

/** Construit l'URL du fichier de snapshot d'un projet. */
export function cloudFilePath(config: CloudConfig, projectId: string): string {
  const base = config.baseUrl.replace(/\/+$/, '')
  const folder = config.folder.replace(/^\/+|\/+$/g, '')
  const segments = [...(folder ? folder.split('/') : []), 'lorewriter', `${projectId}.json`]
  return `${base}/${segments.map(encodeURIComponent).join('/')}`
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

export async function pushSnapshotToCloud(config: CloudConfig, projectId: string, snapshotJson: string): Promise<void> {
  const url = cloudFilePath(config, projectId)
  await ensureCollections(config, url)
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...authHeader(config), 'Content-Type': 'application/json; charset=utf-8' },
    body: snapshotJson,
  })
  if (!res.ok) throw new Error(`Échec de l'envoi vers le cloud (HTTP ${res.status})`)
}

export async function pullSnapshotFromCloud(config: CloudConfig, projectId: string): Promise<string | null> {
  const url = cloudFilePath(config, projectId)
  const res = await fetch(url, { method: 'GET', headers: authHeader(config) })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Échec du téléchargement depuis le cloud (HTTP ${res.status})`)
  return await res.text()
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

/**
 * Synchronise un projet avec le cloud : télécharge le snapshot distant,
 * fusionne (entité par entité, la plus récente gagne), réapplique en local
 * si besoin, puis renvoie le snapshot fusionné.
 */
export async function syncProjectWithCloud(projectId: string, config?: CloudConfig | null): Promise<SyncStatus> {
  const cfg = config === undefined ? loadCloudConfig() : config
  if (!cfg || !cfg.enabled) throw new Error('Synchronisation cloud non configurée ou désactivée.')
  const local = await buildSnapshot(projectId)
  const remoteJson = await pullSnapshotFromCloud(cfg, projectId)
  let snapshot: ProjectSnapshot = local
  let action: SyncStatus['action'] = 'pushed'
  if (remoteJson) {
    const remote = parseSnapshot(remoteJson)
    const merged = mergeSnapshots(local, remote)
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
  await pushSnapshotToCloud(cfg, projectId, serializeSnapshot(snapshot))
  const status: SyncStatus = { at: Date.now(), projectId, action }
  localStorage.setItem(lastSyncKey(projectId), JSON.stringify(status))
  return status
}
