import { db } from '../db'
import {
  loadCloudConfig,
  markBackupDone,
  shouldBackupNow,
  syncProjectWithCloud,
  type CloudConfig,
  type SyncStatus,
} from './cloud'
import { downloadFile, exportProjectLore } from './queries'
import { LORE_MIME } from './lore'
import { isDesktopApp, saveFileNative, writeFileNative } from './desktop'

/** Nom de fichier de sauvegarde : `<projet>-AAAAMMJJ-HHMM.lore` (caractères interdits remplacés). */
export function backupFileName(projectName: string, at: number): string {
  const d = new Date(at)
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
  const safe = projectName.replace(/[\\/:*?"<>|]/g, '-').trim() || 'projet'
  return `${safe}-${stamp}.lore`
}

/**
 * Synchronise le projet avec le cloud, puis — si la sauvegarde automatique est
 * configurée — exporte un fichier `.lore` :
 * - app desktop + dossier choisi : écriture silencieuse dans ce dossier ;
 * - app desktop sans dossier : boîte de dialogue native de sauvegarde ;
 * - navigateur/PWA : téléchargement.
 */
export async function syncProjectWithBackup(projectId: string, config?: CloudConfig | null): Promise<SyncStatus> {
  const st = await syncProjectWithCloud(projectId, config)
  const cfg = config === undefined ? loadCloudConfig() : config
  if (!cfg?.enabled || !shouldBackupNow(cfg, projectId, st.at)) return st
  const project = await db.projects.get(projectId)
  const bytes = await exportProjectLore(projectId)
  const name = backupFileName(project?.name ?? 'projet', st.at)
  if (isDesktopApp()) {
    if (cfg.backupDir && (await writeFileNative(cfg.backupDir, name, bytes))) {
      markBackupDone(projectId, st.at)
      return st
    }
    const res = await saveFileNative(name, bytes, 'Sauvegarde LoreWriter (.lore)', ['lore'])
    if (res === 'saved') markBackupDone(projectId, st.at)
  } else {
    downloadFile(name, bytes, LORE_MIME)
    markBackupDone(projectId, st.at)
  }
  return st
}
