import type { Locale } from '../i18n'

/**
 * Drapeaux en SVG inline — les emojis 🇫🇷/🇬🇧 ne rendent pas sous Windows
 * (WebView2/Chrome affichent « FR »/« GB »), d'où des SVG.
 */

export function FlagFr({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round((size * 2) / 3)} viewBox="0 0 3 2" aria-hidden="true" style={{ borderRadius: 2 }}>
      <rect width="1" height="2" fill="#0055A4" />
      <rect x="1" width="1" height="2" fill="#FFFFFF" />
      <rect x="2" width="1" height="2" fill="#EF4135" />
    </svg>
  )
}

/** Union Jack simplifié (reconnaissable à petite taille). */
export function FlagGb({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round((size * 2) / 3)} viewBox="0 0 60 40" aria-hidden="true" style={{ borderRadius: 2 }}>
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFFFFF" strokeWidth="8" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 V40 M0,20 H60" stroke="#FFFFFF" strokeWidth="13" />
      <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="7" />
    </svg>
  )
}

export function Flag({ locale, size }: { locale: Locale; size?: number }) {
  return locale === 'fr' ? <FlagFr size={size} /> : <FlagGb size={size} />
}
