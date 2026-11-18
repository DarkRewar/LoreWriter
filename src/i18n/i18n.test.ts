import { describe, expect, it, vi } from 'vitest'
import { en } from './en'
import { fr, type Messages } from './fr'
import { detectLocale, interpolate, loadLocale, saveLocale, setI18nLocale, tStandalone } from './index'

/** Aplatit un dictionnaire imbriqué en liste de clés pointées. */
function keysOf(obj: Record<string, unknown>, prefix = ''): string[] {
  const out: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object') out.push(...keysOf(v as Record<string, unknown>, key))
    else out.push(key)
  }
  return out.sort()
}

describe('parité des dictionnaires fr/en', () => {
  it('en a exactement les mêmes clés que fr (le type Messages le garantit aussi à la compilation)', () => {
    expect(keysOf(en as unknown as Record<string, unknown>)).toEqual(keysOf(fr as unknown as Record<string, unknown>))
  })

  it('aucune valeur vide', () => {
    for (const k of keysOf(fr as unknown as Record<string, unknown>)) {
      const v = k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], fr as unknown as Messages)
      expect(typeof v).toBe('string')
      expect((v as string).length).toBeGreaterThan(0)
    }
  })
})

describe('interpolate', () => {
  it('remplace {var} et laisse les inconnues telles quelles', () => {
    expect(interpolate('Supprimer « {name} » ?', { name: 'Aubeval' })).toBe('Supprimer « Aubeval » ?')
    expect(interpolate('{a} et {b}', { a: 1, b: 'x' })).toBe('1 et x')
    expect(interpolate('{a} {b}', { a: 1 })).toBe('1 {b}')
    expect(interpolate('sans var')).toBe('sans var')
  })
})

describe('detectLocale', () => {
  it('français si navigator.language commence par fr', () => {
    expect(detectLocale('fr-FR')).toBe('fr')
    expect(detectLocale('fr')).toBe('fr')
    expect(detectLocale('FR-be')).toBe('fr')
  })
  it('anglais pour toute autre langue d’OS', () => {
    expect(detectLocale('en-US')).toBe('en')
    expect(detectLocale('de-DE')).toBe('en')
    expect(detectLocale('ja')).toBe('en')
  })
})

describe('tStandalone + persistance', () => {
  it('traduit selon la locale courante et interpole', () => {
    setI18nLocale('fr')
    expect(tStandalone('common.save')).toBe('Enregistrer')
    expect(tStandalone('projects.deleteMessage', { name: 'X' })).toBe('Supprimer définitivement le projet « X » et tout son contenu ?')
    setI18nLocale('en')
    expect(tStandalone('common.save')).toBe('Save')
    expect(tStandalone('projects.deleteMessage', { name: 'X' })).toBe('Permanently delete the project “X” and all its content?')
  })

  it('clé inconnue -> retourne la clé', () => {
    setI18nLocale('fr')
    expect(tStandalone('nope.pas.la' as never)).toBe('nope.pas.la')
  })

  it('loadLocale/saveLocale via localStorage', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
    })
    expect(loadLocale()).toBe(detectLocale()) // rien de persisté -> langue de l'OS
    saveLocale('en')
    expect(loadLocale()).toBe('en')
    saveLocale('fr')
    expect(loadLocale()).toBe('fr')
  })
})
