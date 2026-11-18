import { describe, expect, it } from 'vitest'
import { searchEntities, type SearchInput } from './search'
import { setI18nLocale } from '../i18n'

setI18nLocale('fr')
import type { Character } from '../types'

const char = (over: Partial<Character>): Character => ({
  id: 'c1',
  projectId: 'p1',
  firstName: '',
  lastName: '',
  nickname: '',
  birthDate: '',
  manualAge: null,
  role: '',
  tags: [],
  metadata: [],
  description: '',
  portrait: '',
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

const input = (over: Partial<SearchInput> = {}): SearchInput => ({
  projectId: 'p1',
  characters: [],
  relationships: [],
  dialogueScenes: [],
  novels: [],
  chapters: [],
  plots: [],
  wiki: [],
  ...over,
})

describe('searchEntities', () => {
  it('retrouve un personnage par tag, insensible aux accents', () => {
    const res = searchEntities(
      input({ characters: [char({ id: 'c1', firstName: 'Ana', tags: ['Voleuse'], role: '' })] }),
      'voleuse',
    )
    expect(res).toHaveLength(1)
    expect(res[0].kind).toBe('character')
    expect(res[0].path).toBe('characters/c1')
  })

  it('retrouve un personnage par métadonnée libre', () => {
    const res = searchEntities(
      input({
        characters: [char({ id: 'c1', firstName: 'Marc', metadata: [{ id: 'm1', key: 'métier', value: 'Forgeron' }] })],
      }),
      'forgeron',
    )
    expect(res.some((r) => r.kind === 'character')).toBe(true)
  })

  it('retrouve un personnage par surnom', () => {
    const res = searchEntities(
      input({ characters: [char({ id: 'c1', firstName: 'Jean', nickname: 'Le Roux' })] }),
      'roux',
    )
    expect(res[0]?.title).toBe('Jean')
  })

  it('retrouve une réplique de dialogue avec le nom du personnage', () => {
    const res = searchEntities(
      input({
        characters: [char({ id: 'c1', firstName: 'Léa' })],
        dialogueScenes: [
          {
            id: 's1',
            projectId: 'p1',
            title: 'Cave',
            description: '',
            plotId: '',
            lines: [{ id: 'l1', characterId: 'c1', text: "Je ne sortirai jamais d'ici." }],
            createdAt: 1,
            updatedAt: 1,
          },
        ],
      }),
      'jamais',
    )
    expect(res).toHaveLength(1)
    expect(res[0].kind).toBe('dialogue')
    expect(res[0].snippet).toContain('Léa')
    expect(res[0].path).toBe('dialogues/s1')
  })

  it('retrouve une scène de dialogue via le titre de son intrigue liée', () => {
    const res = searchEntities(
      input({
        dialogueScenes: [
          {
            id: 's1',
            projectId: 'p1',
            title: 'Cave',
            description: '',
            plotId: 'pl1',
            lines: [],
            createdAt: 1,
            updatedAt: 1,
          },
        ],
        plots: [{ id: 'pl1', projectId: 'p1', title: 'La disparition du sceptre', synopsis: '', status: 'wip', tags: [], characterIds: [], createdAt: 1, updatedAt: 1 }],
      }),
      'sceptre',
    )
    const dlg = res.find((r) => r.kind === 'dialogue')
    expect(dlg).toBeDefined()
    expect(dlg?.path).toBe('dialogues/s1')
    expect(dlg?.subtitle).toContain('La disparition du sceptre')
  })

  it('retrouve du texte dans un chapitre (HTML nettoyé)', () => {
    const res = searchEntities(
      input({
        novels: [{ id: 'n1', projectId: 'p1', title: 'Mon premier roman', createdAt: 1, updatedAt: 1 }],
        chapters: [
          { id: 'ch1', projectId: 'p1', novelId: 'n1', title: 'Chapitre 1', content: '<p>La <em>forêt</em> bruissait.</p>', order: 0, createdAt: 1, updatedAt: 1 },
        ],
      }),
      'foret',
    )
    expect(res[0]?.kind).toBe('chapter')
    expect(res[0]?.snippet).toContain('forêt')
    expect(res[0]?.path).toBe('novel?novel=n1')
    expect(res[0]?.subtitle).toContain('Mon premier roman')
  })

  it('retrouve une entrée wiki par titre ou contenu', () => {
    const res = searchEntities(
      input({
        wiki: [
          { id: 'w1', projectId: 'p1', title: 'Aubeval', content: '<p>Royaume de l’ouest, <em>cité</em> fortifiée.</p>', createdAt: 1, updatedAt: 1 },
        ],
      }),
      'cité',
    )
    expect(res.map((r) => r.kind)).toEqual(['wiki'])
    expect(res[0].path).toBe('wiki/w1')
    expect(res[0].snippet).toContain('cité')
  })

  it('retrouve un roman par son titre', () => {
    const res = searchEntities(
      input({ novels: [{ id: 'n1', projectId: 'p1', title: 'La Cité engloutie', createdAt: 1, updatedAt: 1 }] }),
      'cité',
    )
    expect(res.map((r) => r.kind)).toEqual(['novel'])
    expect(res[0].path).toBe('novel?novel=n1')
  })

  it('retrouve une intrigue par son titre', () => {
    const res = searchEntities(
      input({
        plots: [{ id: 'pl1', projectId: 'p1', title: 'Trahison', synopsis: "Quelqu'un ment.", status: 'idea', tags: [], characterIds: [], createdAt: 1, updatedAt: 1 }],
      }),
      'trahison',
    )
    expect(res.map((r) => r.kind)).toEqual(['plot'])
  })

  it('retrouve une relation par son type et les noms des personnages', () => {
    const res = searchEntities(
      input({
        characters: [char({ id: 'c1', firstName: 'Ana' }), char({ id: 'c2', firstName: 'Bob' })],
        relationships: [{ id: 'r1', projectId: 'p1', sourceId: 'c1', targetId: 'c2', type: 'spouse', label: '', createdAt: 1, updatedAt: 1 }],
      }),
      'conjoint',
    )
    expect(res.map((r) => r.kind)).toEqual(['relationship'])
    expect(res[0].title).toBe('Ana conjoint·e de Bob')
  })

  it('trie par pertinence (correspondance en début de nom en premier)', () => {
    const res = searchEntities(
      input({
        characters: [char({ id: 'a', firstName: 'Zoé', description: 'parle de Marie' }), char({ id: 'b', firstName: 'Marie' })],
      }),
      'marie',
    )
    expect(res[0].id).toBe('b')
  })

  it('retourne rien pour une requête vide', () => {
    expect(searchEntities(input({ characters: [char({ id: 'c1', firstName: 'Ana' })] }), '   ')).toEqual([])
  })
})
