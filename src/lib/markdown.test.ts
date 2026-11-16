import { describe, expect, it } from 'vitest'
import { htmlToMarkdown, markdownToHtml, parseChapterFile, serializeChapterFile } from './markdown'
import type { Chapter } from '../types'

describe('htmlToMarkdown', () => {
  it('convertit les blocs de base produits par TipTap', () => {
    const html = '<h2>Titre</h2><p>Un <strong>mot gras</strong> et <em>italique</em> et <s>barré</s>.</p>'
    expect(htmlToMarkdown(html)).toBe('## Titre\n\nUn **mot gras** et *italique* et ~~barré~~.')
  })

  it('convertit listes à puces, numérotées et citations', () => {
    const html = '<ul><li>un</li><li>deux</li></ul><ol><li>premier</li><li>second</li></ol><blockquote><p>cit.</p></blockquote>'
    expect(htmlToMarkdown(html)).toBe('- un\n- deux\n\n1. premier\n2. second\n\n> cit.')
  })

  it('convertit sauts de ligne et filets', () => {
    expect(htmlToMarkdown('<p>a<br>b</p><hr><p>c</p>')).toBe('a\nb\n\n---\n\nc')
  })

  it('décode les entités HTML et échappe les caractères spéciaux markdown', () => {
    expect(htmlToMarkdown('<p>5 &lt; 6 &amp; "oui"</p>')).toBe('5 \\< 6 & "oui"')
    expect(htmlToMarkdown('<p>un *asterisk* littéral</p>')).toBe('un \\*asterisk\\* littéral')
  })

  it('échappe un début de ligne qui ressemblerait à une liste', () => {
    expect(htmlToMarkdown('<p>1. ceci est un texte</p>')).toBe('1\\. ceci est un texte')
    expect(htmlToMarkdown('<p>- ceci aussi</p>')).toBe('\\- ceci aussi')
  })

  it('retourne une chaîne vide pour un contenu vide', () => {
    expect(htmlToMarkdown('')).toBe('')
    expect(htmlToMarkdown('<p></p>')).toBe('')
  })
})

describe('markdownToHtml', () => {
  it('convertit les blocs de base', () => {
    const md = '## Titre\n\nUn **mot gras** et *italique* et ~~barré~~.\n\n- un\n- deux\n\n> cit.'
    expect(markdownToHtml(md)).toBe(
      '<h2>Titre</h2>\n<p>Un <strong>mot gras</strong> et <em>italique</em> et <s>barré</s>.</p>\n<ul><li>un</li><li>deux</li></ul>\n<blockquote><p>cit.</p></blockquote>',
    )
  })

  it('gère les listes numérotées et les filets', () => {
    expect(markdownToHtml('1. a\n2. b\n\n---')).toBe('<ol><li>a</li><li>b</li></ol>\n<hr>')
  })

  it('respecte les échappements et encode le HTML brut', () => {
    expect(markdownToHtml('1\\. texte <script>alert(1)</script>')).toBe(
      '<p>1. texte &lt;script&gt;alert(1)&lt;/script&gt;</p>',
    )
    expect(markdownToHtml('\\*pas italique\\*')).toBe('<p>*pas italique*</p>')
  })

  it('joint les lignes d\'un paragraphe par des <br>', () => {
    expect(markdownToHtml('ligne un\nligne deux')).toBe('<p>ligne un<br>ligne deux</p>')
  })
})

describe('aller-retour HTML <-> Markdown', () => {
  it('est stable sur un contenu riche', () => {
    const html =
      '<h2>Chapitre 1</h2><p>Il était <strong>une fois</strong>, dans une <em>forêt</em> sombre.</p><ul><li>point 1</li><li>point 2 avec <strong>gras</strong></li></ul><blockquote><p>« Partez ! » cria-t-il.</p></blockquote><p>Fin.</p>'
    const md = htmlToMarkdown(html)
    expect(htmlToMarkdown(markdownToHtml(md))).toBe(md)
  })
})

describe('fichier chapitre (.md avec frontmatter)', () => {
  const chapter = (over: Partial<Chapter> = {}): Chapter => ({
    id: 'ch1',
    projectId: 'p1',
    title: 'Chapitre 1 : "La fuite"',
    content: '<h2>Départ</h2><p>Elle prit son sac et <strong>partit</strong>.</p>',
    order: 2,
    createdAt: 100,
    updatedAt: 200,
    ...over,
  })

  it('sérialise puis relit un chapitre fidèlement', () => {
    const ch = chapter()
    const file = serializeChapterFile(ch)
    expect(file.startsWith('---\nid: "ch1"\n')).toBe(true)
    expect(file).toContain('## Départ')
    expect(file).toContain('**partit**')
    const back = parseChapterFile(file)
    expect(back.id).toBe('ch1')
    expect(back.projectId).toBe('p1')
    expect(back.title).toBe('Chapitre 1 : "La fuite"')
    expect(back.order).toBe(2)
    expect(back.createdAt).toBe(100)
    expect(back.updatedAt).toBe(200)
    expect(back.content).toContain('<strong>partit</strong>')
    expect(htmlToMarkdown(back.content)).toBe(htmlToMarkdown(ch.content))
  })

  it('rejette un fichier sans frontmatter ou sans id', () => {
    expect(() => parseChapterFile('# juste du texte')).toThrow(/frontmatter/)
    expect(() => parseChapterFile('---\ntitle: "x"\n---\n\nbody')).toThrow(/id manquant/)
  })

  it('gère un contenu vide', () => {
    const back = parseChapterFile(serializeChapterFile(chapter({ content: '' })))
    expect(back.content).toBe('')
  })
})
