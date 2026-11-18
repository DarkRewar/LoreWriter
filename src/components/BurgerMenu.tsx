import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useMatch } from 'react-router-dom'
import { projectNavItems } from '../nav'
import SyncNowButton from './SyncNowButton'
import { useI18n } from '../i18n'

/** Burger menu mobile : nav app (projets/cloud) + nav du projet courant. Visible en ≤ 860px. */
export default function BurgerMenu() {
  const [open, setOpen] = useState(false)
  const match = useMatch('/projects/:projectId/*')
  const projectId = match?.params.projectId ?? ''
  const location = useLocation()
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useI18n()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

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
    <div className="burger" ref={ref}>
      <button
        type="button"
        className="btn-icon burger-btn"
        aria-label={t('burger.openMenu')}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ☰
      </button>
      {open && (
        <div className="burger-menu" role="menu">
          <div className="burger-section">
            <div className="burger-section-title">{t('burger.sectionProject')}</div>
            <Link to="/">🏠 {t('app.projects')}</Link>
            <Link to="/cloud">{t('app.cloud')}</Link>
            {projectId && <SyncNowButton />}
          </div>
          {projectId && (
            <div className="burger-section">
              <div className="burger-section-title">{t('burger.sectionInProject')}</div>
              {projectNavItems(`/projects/${projectId}`, t).map((item) => (
                <Link key={item.to} to={item.to}>
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
