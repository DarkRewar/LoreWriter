import { characterDisplayName, type Chapter, type Character, type DialogueScene, type Plot, type Relationship } from '../types'
import { relationshipTypeInfo } from './relationships'
import { makeSnippet, normalizeForSearch, stripHtml } from './text'

export type SearchKind = 'character' | 'relationship' | 'dialogue' | 'chapter' | 'plot'

export interface SearchResult {
  kind: SearchKind
  id: string
  title: string
  subtitle: string
  snippet: string
  score: number
  /** Chemin relatif sous /projects/:projectId */
  path: string
}

export interface SearchInput {
  projectId: string
  characters: Character[]
  relationships: Relationship[]
  dialogueScenes: DialogueScene[]
  chapters: Chapter[]
  plots: Plot[]
}

interface Field {
  text: string
  weight: number
}

function scoreFields(fields: Field[], query: string): { score: number; matchedText: string } {
  const q = normalizeForSearch(query).text
  if (!q) return { score: 0, matchedText: '' }
  let score = 0
  let matchedText = ''
  for (const f of fields) {
    const n = normalizeForSearch(f.text)
    const at = n.text.indexOf(q)
    if (at === -1) continue
    const s = f.weight * (at === 0 ? 2 : 1)
    if (s > score) {
      score = s
      matchedText = f.text
    }
  }
  return { score, matchedText }
}

export const SEARCH_KIND_LABELS: Record<SearchKind, string> = {
  character: 'Personnage',
  relationship: 'Relation',
  dialogue: 'Dialogue',
  chapter: 'Chapitre',
  plot: 'Intrigue',
}

export function searchEntities(input: SearchInput, rawQuery: string, limit = 50): SearchResult[] {
  const results: SearchResult[] = []
  const q = rawQuery.trim()
  if (!q) return results

  const charName = (id: string): string => {
    const c = input.characters.find((x) => x.id === id)
    return c ? characterDisplayName(c) : 'Personnage supprimé'
  }

  const plotTitle = (id: string): string => {
    if (!id) return ''
    const p = input.plots.find((x) => x.id === id)
    return p ? p.title : ''
  }

  for (const c of input.characters) {
    const name = characterDisplayName(c)
    const fields: Field[] = [
      { text: name, weight: 10 },
      { text: c.nickname, weight: 8 },
      { text: c.tags.join(' '), weight: 6 },
      { text: c.role, weight: 5 },
      { text: c.metadata.map((m) => `${m.key} ${m.value}`).join(' '), weight: 4 },
      { text: c.birthDate, weight: 3 },
      { text: c.description, weight: 2 },
    ]
    const { score, matchedText } = scoreFields(fields, q)
    if (score > 0) {
      const fallback = [name, c.nickname, c.role, c.tags.join(', '), c.description].filter(Boolean).join(' — ')
      results.push({
        kind: 'character',
        id: c.id,
        title: name,
        subtitle: [c.nickname ? `« ${c.nickname} »` : '', c.role].filter(Boolean).join(' — '),
        snippet: makeSnippet(matchedText || fallback, q),
        score,
        path: `characters/${c.id}`,
      })
    }
  }

  for (const r of input.relationships) {
    const info = relationshipTypeInfo(r.type)
    const text = `${charName(r.sourceId)} ${r.label || info.label} ${charName(r.targetId)}`
    const { score, matchedText } = scoreFields(
      [
        { text, weight: 8 },
        { text: r.label, weight: 6 },
        { text: info.label, weight: 4 },
      ],
      q,
    )
    if (score > 0) {
      results.push({
        kind: 'relationship',
        id: r.id,
        title: text,
        subtitle: 'Relation',
        snippet: makeSnippet(matchedText || text, q),
        score,
        path: 'relations',
      })
    }
  }

  for (const s of input.dialogueScenes) {
    const linkedPlot = plotTitle(s.plotId ?? '')
    const sceneScore = scoreFields(
      [
        { text: s.title, weight: 8 },
        { text: linkedPlot, weight: 5 },
        { text: s.description, weight: 3 },
      ],
      q,
    )
    let bestLine: { text: string; character: string } | null = null
    let lineScore = 0
    for (const line of s.lines) {
      const who = line.characterId ? charName(line.characterId) : 'Narrateur'
      const { score } = scoreFields(
        [
          { text: line.text, weight: 6 },
          { text: who, weight: 5 },
        ],
        q,
      )
      if (score > lineScore) {
        lineScore = score
        bestLine = { text: line.text, character: who }
      }
    }
    const score = Math.max(sceneScore.score, lineScore)
    if (score > 0) {
      const snippet =
        bestLine && lineScore >= sceneScore.score
          ? `${bestLine.character} : ${makeSnippet(bestLine.text, q)}`
          : makeSnippet(sceneScore.matchedText || s.title, q)
      results.push({
        kind: 'dialogue',
        id: s.id,
        title: s.title || 'Dialogue sans titre',
        subtitle: `${s.lines.length} réplique(s)${linkedPlot ? ` · 🧩 ${linkedPlot}` : ''}`,
        snippet,
        score,
        path: `dialogues/${s.id}`,
      })
    }
  }

  for (const ch of input.chapters) {
    const plain = stripHtml(ch.content)
    const { score, matchedText } = scoreFields(
      [
        { text: ch.title, weight: 10 },
        { text: plain, weight: 2 },
      ],
      q,
    )
    if (score > 0) {
      results.push({
        kind: 'chapter',
        id: ch.id,
        title: ch.title || 'Chapitre sans titre',
        subtitle: 'Roman',
        snippet: makeSnippet(matchedText || plain, q),
        score,
        path: 'novel',
      })
    }
  }

  for (const p of input.plots) {
    const { score, matchedText } = scoreFields(
      [
        { text: p.title, weight: 10 },
        { text: p.tags.join(' '), weight: 6 },
        { text: p.synopsis, weight: 4 },
      ],
      q,
    )
    if (score > 0) {
      results.push({
        kind: 'plot',
        id: p.id,
        title: p.title,
        subtitle: 'Intrigue',
        snippet: makeSnippet(matchedText || p.synopsis, q),
        score,
        path: `plots/${p.id}`,
      })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit)
}
