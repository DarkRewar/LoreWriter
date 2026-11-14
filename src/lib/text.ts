/**
 * Normalise une chaîne pour la recherche : minuscules, accents supprimés,
 * espaces normalisés. Retourne aussi la correspondance d'index vers la
 * chaîne d'origine pour pouvoir extraire des extraits fidèles.
 */
export function normalizeForSearch(input: string): { text: string; map: number[] } {
  const parts: string[] = []
  const map: number[] = []
  let index = 0
  for (const ch of Array.from(input)) {
    const rep = ch
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
    for (const c of Array.from(rep)) {
      if (/\s/.test(c)) {
        if (parts.length > 0 && parts[parts.length - 1] !== ' ') {
          parts.push(' ')
          map.push(index)
        }
      } else {
        parts.push(c)
        map.push(index)
      }
    }
    index += ch.length
  }
  let start = 0
  while (start < parts.length && parts[start] === ' ') start++
  let end = parts.length
  while (end > start && parts[end - 1] === ' ') end--
  return { text: parts.slice(start, end).join(''), map: map.slice(start, end) }
}

/** Supprime les balises HTML et décode les entités usuelles. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Extrait un extrait centré sur la première occurrence de la requête. */
export function makeSnippet(original: string, query: string, radius = 70): string {
  const q = normalizeForSearch(query).text
  const hay = normalizeForSearch(original)
  if (!q) {
    return original.length > radius * 2 ? `${original.slice(0, radius * 2)}…` : original
  }
  const at = hay.text.indexOf(q)
  if (at === -1) {
    return original.length > radius ? `${original.slice(0, radius)}…` : original
  }
  const startNorm = Math.max(0, at - radius)
  const endNorm = Math.min(hay.text.length, at + q.length + radius)
  const startOrig = hay.map[startNorm] ?? 0
  const endOrig = endNorm < hay.map.length ? hay.map[endNorm] : original.length
  const prefix = startOrig > 0 ? '…' : ''
  const suffix = endOrig < original.length ? '…' : ''
  return `${prefix}${original.slice(startOrig, endOrig).trim()}${suffix}`
}

export function wordCount(html: string): number {
  const t = stripHtml(html)
  return t ? t.split(/\s+/).filter(Boolean).length : 0
}
