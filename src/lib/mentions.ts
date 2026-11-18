import { characterDisplayName, type Character, type DialogueScene, type Novel, type Plot, type WikiEntry } from '../types'
import { normalizeForSearch } from './text'

export type MentionKind = 'character' | 'wiki' | 'dialogue' | 'novel' | 'plot'

export interface MentionRef {
  id: string
  kind: MentionKind
  label: string
}

export const MENTION_KIND_LABELS: Record<MentionKind, string> = {
  character: 'Personnage',
  wiki: 'Wiki',
  dialogue: 'Dialogue',
  novel: 'Roman',
  plot: 'Intrigue',
}

/** href interne d'une mention : `mention://<kind>/<id>` (sérialisé tel quel en Markdown). */
export function mentionHref(ref: { id: string; kind: string }): string {
  return `mention://${ref.kind}/${ref.id}`
}

export function parseMentionHref(href: string): { kind: string; id: string } | null {
  const m = /^mention:\/\/([a-z]+)\/(.+)$/.exec(href)
  return m ? { kind: m[1], id: decodeURIComponent(m[2]) } : null
}

/** Route in-app (HashRouter) vers la page d'une entité mentionnée. */
export function mentionRoute(projectId: string, ref: { id: string; kind: string }): string {
  switch (ref.kind) {
    case 'character':
      return `/projects/${projectId}/characters/${ref.id}`
    case 'wiki':
      return `/projects/${projectId}/wiki/${ref.id}`
    case 'dialogue':
      return `/projects/${projectId}/dialogues/${ref.id}`
    case 'novel':
      return `/projects/${projectId}/novel?novel=${ref.id}`
    case 'plot':
      return `/projects/${projectId}/plots/${ref.id}`
    default:
      return `/projects/${projectId}`
  }
}

/** Construit la liste des entités référençables d'un projet. */
export function collectMentionItems(data: {
  characters: Character[]
  wikiEntries: WikiEntry[]
  dialogueScenes: DialogueScene[]
  novels: Novel[]
  plots: Plot[]
}): MentionRef[] {
  return [
    ...data.characters.map((c) => ({ id: c.id, kind: 'character' as const, label: characterDisplayName(c) })),
    ...data.wikiEntries.map((w) => ({ id: w.id, kind: 'wiki' as const, label: w.title || 'Entrée sans titre' })),
    ...data.dialogueScenes.map((s) => ({ id: s.id, kind: 'dialogue' as const, label: s.title || 'Scène sans titre' })),
    ...data.novels.map((n) => ({ id: n.id, kind: 'novel' as const, label: n.title || 'Roman sans titre' })),
    ...data.plots.map((p) => ({ id: p.id, kind: 'plot' as const, label: p.title || 'Intrigue sans titre' })),
  ]
}

/**
 * Recherche les mentions pour une query tapée après « @ ».
 * Insensible casse/accents ; préfixe > inclusion ; max `limit` résultats.
 * Query vide → [] (la popup n'apparaît qu'après la 1re lettre).
 */
export function searchMentions(items: MentionRef[], query: string, limit = 3): MentionRef[] {
  const q = normalizeForSearch(query).text
  if (!q) return []
  const scored: Array<{ item: MentionRef; score: number }> = []
  for (const item of items) {
    const t = normalizeForSearch(item.label).text
    if (t.startsWith(q)) scored.push({ item, score: 0 })
    else if (t.includes(q)) scored.push({ item, score: 1 })
  }
  scored.sort((a, b) => a.score - b.score || a.item.label.localeCompare(b.item.label, 'fr'))
  return scored.slice(0, limit).map((s) => s.item)
}
