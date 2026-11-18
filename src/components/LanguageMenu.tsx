import { useEffect, useRef, useState } from 'react'
import { LOCALES, useI18n } from '../i18n'
import { Flag } from './flags'

/** Sélecteur de langue (topbar, à gauche, juste après le logo) : drapeau + popup déroulante. */
export default function LanguageMenu() {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [open])

  return (
    <div className="lang-menu" ref={ref}>
      <button
        type="button"
        className="btn-icon lang-btn"
        aria-label={t('language.label')}
        aria-expanded={open}
        title={t('language.label')}
        onClick={() => setOpen((o) => !o)}
      >
        <Flag locale={locale} />
        <span className="lang-caret">▾</span>
      </button>
      {open && (
        <div className="lang-dropdown" role="menu">
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitemradio"
              aria-checked={l === locale}
              className={`lang-option${l === locale ? ' active' : ''}`}
              onClick={() => {
                setLocale(l)
                setOpen(false)
              }}
            >
              <Flag locale={l} />
              <span>{t(`language.${l}` as const)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
