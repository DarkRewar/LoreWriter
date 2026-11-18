export interface NavItem {
  to: string
  label: string
  end?: boolean
}

/** Navigation d'un projet (sidebar desktop + burger mobile). La recherche reste dans la topbar. */
export function projectNavItems(base: string): NavItem[] {
  return [
    { to: base, label: '🏠 Vue d\'ensemble', end: true },
    { to: `${base}/characters`, label: '🧭 Personnages' },
    { to: `${base}/relations`, label: '🔗 Relations' },
    { to: `${base}/plots`, label: '🧵 Intrigues' },
    { to: `${base}/dialogues`, label: '💬 Dialogues' },
    { to: `${base}/novel`, label: '📖 Romans' },
    { to: `${base}/wiki`, label: '📚 Wiki' },
    { to: `${base}/settings`, label: '⚙️ Paramètres' },
  ]
}
