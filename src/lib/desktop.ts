import { isTauri } from '@tauri-apps/api/core'

/** Vrai quand l'app tourne dans la webview Tauri (desktop), faux en web/PWA. */
export function isDesktopApp(): boolean {
  try {
    return isTauri()
  } catch {
    return false
  }
}

export type NativeSaveResult = 'saved' | 'cancelled' | 'unsupported'

/**
 * Ouvre la boîte de dialogue native (Explorateur Windows / Finder macOS) pour
 * choisir où enregistrer `bytes`, puis écrit le fichier. Retourne
 * 'unsupported' hors app desktop (le caller fait alors un téléchargement navigateur).
 */
export async function saveFileNative(
  defaultName: string,
  bytes: Uint8Array,
  filterName: string,
  extensions: string[],
): Promise<NativeSaveResult> {
  if (!isDesktopApp()) return 'unsupported'
  const { save } = await import('@tauri-apps/plugin-dialog')
  const path = await save({
    defaultPath: defaultName,
    filters: [{ name: filterName, extensions }],
  })
  if (!path) return 'cancelled'
  const { writeFile } = await import('@tauri-apps/plugin-fs')
  await writeFile(path, bytes)
  return 'saved'
}
