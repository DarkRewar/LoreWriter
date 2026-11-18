import { describe, expect, it } from 'vitest'
import { collectMentionItems, mentionHref, mentionRoute, parseMentionHref, searchMentions, type MentionRef } from './mentions'
import { htmlToMarkdown, markdownToHtml } from './markdown'
import type { Character, DialogueScene, Novel, Plot, WikiEntry } from '../types'

const items: MentionRef[] = [
  { id: 'c1', kind: 'character', label: 'Machin' },
  { id: 'c2', kind: 'character', label: 'Machoire' },
  { id: 'w1', kind: 'wiki', label: 'Aubeval' },
  { id: 'w2', kind: 'wiki', label: 'Magie ancienne' },
  { id: 's1', kind: 'dialogue', label: 'La cave' },
  { id: 'n1', kind: 'novel', label: 'Le tome I' },
  { id: 'p1', kind: 'plot', label: 'La trahison' },
]

describe('searchMentions', () => {
  it('retourne [] sur query vide (la popup n’apparaît qu’après la 1re lettre)', () => {
    expect(searchMentions(items, '')).toEqual([])
  })

  it('trie par pertinence : préfixe d’abord, puis inclusion, max 3, insensible à la casse/accents', () => {
    const res = searchMentions(items, 'ma')
    expect(res.map((r) => r.label)).toEqual(['Machin', 'Machoire', 'Magie ancienne'])
    expect(searchMentions(items, 'AUBEVAL').map((r) => r.id)).toEqual(['w1'])
    const many = Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, kind: 'character' as const, label: `Test${i}` }))
    expect(searchMentions(many, 'test')).toHaveLength(3)
  })
})

describe('mentionHref / parseMentionHref / mentionRoute', () => {
  it('aller-retour href mention://', () => {
    const href = mentionHref({ id: 'c1', kind: 'character' })
    expect(href).toBe('mention://character/c1')
    expect(parseMentionHref(href)).toEqual({ kind: 'character', id: 'c1' })
    expect(parseMentionHref('https://x')).toBeNull()
  })

  it('routes in-app par kind', () => {
    expect(mentionRoute('p1', { id: 'c1', kind: 'character' })).toBe('/projects/p1/characters/c1')
    expect(mentionRoute('p1', { id: 'w1', kind: 'wiki' })).toBe('/projects/p1/wiki/w1')
    expect(mentionRoute('p1', { id: 's1', kind: 'dialogue' })).toBe('/projects/p1/dialogues/s1')
    expect(mentionRoute('p1', { id: 'n1', kind: 'novel' })).toBe('/projects/p1/novel?novel=n1')
    expect(mentionRoute('p1', { id: 'pl1', kind: 'plot' })).toBe('/projects/p1/plots/pl1')
  })
})

describe('collectMentionItems', () => {
  it('mappe chaque entité avec son label', () => {
    const refs = collectMentionItems({
      characters: [{ id: 'c1', projectId: 'p1', firstName: 'Ana', lastName: 'Machin', nickname: '', birthDate: '', manualAge: null, role: '', tags: [], metadata: [], description: '', portrait: '', createdAt: 1, updatedAt: 1 } as Character],
      wikiEntries: [{ id: 'w1', projectId: 'p1', title: 'Aubeval', content: '', createdAt: 1, updatedAt: 1 } as WikiEntry],
      dialogueScenes: [{ id: 's1', projectId: 'p1', title: 'La cave', description: '', plotId: '', lines: [], createdAt: 1, updatedAt: 1 } as DialogueScene],
      novels: [{ id: 'n1', projectId: 'p1', title: 'Tome I', createdAt: 1, updatedAt: 1 } as Novel],
      plots: [{ id: 'pl1', projectId: 'p1', title: 'Trahison', synopsis: '', status: 'idea', tags: [], characterIds: [], createdAt: 1, updatedAt: 1 } as Plot],
    })
    expect(refs).toEqual([
      { id: 'c1', kind: 'character', label: 'Ana Machin' },
      { id: 'w1', kind: 'wiki', label: 'Aubeval' },
      { id: 's1', kind: 'dialogue', label: 'La cave' },
      { id: 'n1', kind: 'novel', label: 'Tome I' },
      { id: 'pl1', kind: 'plot', label: 'Trahison' },
    ])
  })
})

describe('mentions en Markdown (round-trip)', () => {
  it('htmlToMarkdown sérialise une mention en [@Label](mention://kind/id)', () => {
    const md = htmlToMarkdown('<p>Voir <a class="mention" href="mention://character/c1" data-mention-id="c1" data-mention-kind="character">@Machin</a> ici.</p>')
    expect(md).toBe('Voir [@Machin](mention://character/c1) ici.')
  })

  it('markdownToHtml relit [@Label](mention://kind/id) en lien mention', () => {
    const html = markdownToHtml('Voir [@Machin](mention://character/c1) ici.')
    expect(html).toContain('<a href="mention://character/c1">@Machin</a>')
  })
})
