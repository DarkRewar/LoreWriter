import type { MessageKey, MessageVars } from './i18n'

export interface NavItem {
  to: string
  label: string
  end?: boolean
}

type T = (key: MessageKey, vars?: MessageVars) => string

/** Navigation d'un projet (sidebar desktop + burger mobile). La recherche reste dans la topbar. */
export function projectNavItems(base: string, t: T): NavItem[] {
  return [
    { to: base, label: t('nav.overview'), end: true },
    { to: `${base}/characters`, label: t('nav.characters') },
    { to: `${base}/relations`, label: t('nav.relations') },
    { to: `${base}/plots`, label: t('nav.plots') },
    { to: `${base}/dialogues`, label: t('nav.dialogues') },
    { to: `${base}/novel`, label: t('nav.novels') },
    { to: `${base}/wiki`, label: t('nav.wiki') },
    { to: `${base}/settings`, label: t('nav.settings') },
  ]
}
