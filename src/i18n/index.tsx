import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { fr, type Messages } from './fr'
import { en } from './en'

export type Locale = 'fr' | 'en'

export const LOCALES: readonly Locale[] = ['fr', 'en']

const DICTS: Record<Locale, Messages> = { fr, en }

const STORAGE_KEY = 'lorewriter:lang'

/** Langue de l'OS par défaut (navigator.language), sinon anglais. */
export function detectLocale(navLang: string = navigator.language): Locale {
  return navLang.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

/** Langue persistée, ou celle de l'OS si jamais choisie. */
export function loadLocale(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'fr' || v === 'en') return v
  } catch {
    /* stockage indisponible */
  }
  return detectLocale()
}

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* stockage indisponible */
  }
}

/** Toutes les clés pointées du dictionnaire, ex. 'nav.characters'. */
export type MessageKey = {
  [K in keyof Messages & string]: Messages[K] extends Record<string, unknown>
    ? `${K}.${NestedKeyOf<Messages[K]>}`
    : K
}[keyof Messages & string]

type NestedKeyOf<T> = T extends Record<string, unknown>
  ? {
      [K in keyof T & string]: T[K] extends Record<string, unknown> ? `${K}.${NestedKeyOf<T[K]>}` : K
    }[keyof T & string]
  : never

export type MessageVars = Record<string, string | number>

function lookup(dict: Messages, key: string): string {
  let cur: unknown = dict
  for (const part of key.split('.')) {
    if (cur === null || typeof cur !== 'object' || !(part in cur)) return key
    cur = (cur as Record<string, unknown>)[part]
  }
  return typeof cur === 'string' ? cur : key
}

/** Interpolation simple « {var} ». */
export function interpolate(text: string, vars?: MessageVars): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m))
}

// --- locale courante hors React (libs : search, relationships…) ---
let currentLocale: Locale = loadLocale()

export function setI18nLocale(locale: Locale): void {
  currentLocale = locale
}

export function getI18nLocale(): Locale {
  return currentLocale
}

/** Traduction standalone (hors composant React). */
export function tStandalone(key: MessageKey, vars?: MessageVars): string {
  return interpolate(lookup(DICTS[currentLocale], key), vars)
}

export interface I18n {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: MessageKey, vars?: MessageVars) => string
  /** Locale BCP-47 pour les dates (toLocaleString/toLocaleDateString/localeCompare). */
  dateLocale: string
}

const I18nContext = createContext<I18n>({
  locale: 'fr',
  setLocale: () => {},
  t: (key) => key,
  dateLocale: 'fr-FR',
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => loadLocale())

  const setLocale = useCallback((l: Locale) => {
    saveLocale(l)
    setI18nLocale(l)
    setLocaleState(l)
    document.documentElement.lang = l
  }, [])

  const t = useCallback((key: MessageKey, vars?: MessageVars) => interpolate(lookup(DICTS[locale], key), vars), [locale])

  const value = useMemo<I18n>(
    () => ({ locale, setLocale, t, dateLocale: locale === 'fr' ? 'fr-FR' : 'en-US' }),
    [locale, setLocale, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  return useContext(I18nContext)
}
