import { describe, expect, it } from 'vitest'
import { makeSnippet, normalizeForSearch, stripHtml, wordCount } from './text'

describe('normalizeForSearch', () => {
  it('casse la casse et supprime les accents', () => {
    expect(normalizeForSearch('Élène ÇA')).toEqual(
      expect.objectContaining({ text: 'elene ca' }),
    )
  })

  it('normalise les espaces', () => {
    expect(normalizeForSearch('  a   b\tc ').text).toBe('a b c')
  })

  it('conserve une carte d\'index vers l\'original', () => {
    const { text, map } = normalizeForSearch('Éléonore')
    expect(text).toBe('eleonore')
    expect(text.length).toBe(map.length)
    expect(map[0]).toBe(0)
  })
})

describe('stripHtml', () => {
  it('supprime les balises et décode les entités', () => {
    expect(stripHtml('<p>Bonjour <b>le</b> monde &amp; tous</p>')).toBe('Bonjour le monde & tous')
  })

  it('ignore le contenu des scripts', () => {
    expect(stripHtml('<script>alert(1)</script><p>ok</p>')).toBe('ok')
  })
})

describe('makeSnippet', () => {
  it('centre l\'extrait sur la correspondance, même avec accents', () => {
    const original = 'Il était une fois une jeune fille nommée Éléonore qui vivait dans un village lointain.'
    const snippet = makeSnippet(original, 'eleonore', 20)
    expect(snippet).toContain('Éléonore')
    expect(snippet.startsWith('…')).toBe(true)
  })

  it('retourne le début si pas de correspondance', () => {
    expect(makeSnippet('court', 'zzz')).toBe('court')
  })
})

describe('wordCount', () => {
  it('compte les mots d\'un HTML', () => {
    expect(wordCount('<p>un deux<br>trois</p>')).toBe(3)
    expect(wordCount('')).toBe(0)
  })
})
