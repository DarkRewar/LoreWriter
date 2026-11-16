export const SAVE_EVENT = 'lorewriter:save-now'

/** Demande à tous les éditeurs de vider immédiatement leur tampon (debounce). */
export function requestSaveNow(): void {
  window.dispatchEvent(new Event(SAVE_EVENT))
}
