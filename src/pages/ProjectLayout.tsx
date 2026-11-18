import { useEffect, useState } from 'react'
import { NavLink, Link, Outlet } from 'react-router-dom'
import { useProject, useProjectId } from '../hooks'
import { loadCloudConfig, lastSyncStatus, type SyncStatus } from '../lib/cloud'
import { syncProjectWithBackup } from '../lib/backup'
import SyncNowButton from '../components/SyncNowButton'
import { projectNavItems } from '../nav'
import { useI18n, type MessageKey } from '../i18n'

export default function ProjectLayout() {
  const projectId = useProjectId()
  const project = useProject()
  const { t, dateLocale } = useI18n()
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<SyncStatus | null>(() => lastSyncStatus(projectId))

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const cfg = loadCloudConfig()
      if (!cfg?.enabled) return
      try {
        const st = await syncProjectWithBackup(projectId)
        if (cancelled) return
        setLastSync(st)
        const action = t(`layout.syncActions.${st.action}` as MessageKey)
        setSyncMsg(`☁️ ${action} · ${new Date(st.at).toLocaleTimeString(dateLocale)}`)
      } catch (err) {
        if (!cancelled)
          setSyncMsg(t('layout.syncError', { error: err instanceof Error ? err.message : t('common.unknownError') }))
      }
    }
    void run()
    const timer = setInterval(run, 60_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [projectId, t, dateLocale])

  if (!project) {
    return (
      <div className="page">
        <p>{t('layout.projectNotFound')}</p>
        <Link to="/">{t('layout.backToProjects')}</Link>
      </div>
    )
  }

  const base = `/projects/${projectId}`
  const items = projectNavItems(base, t)

  return (
    <div className="project-layout">
      <aside className="sidebar">
        <Link to="/" className="sidebar-back">
          {t('layout.backToProjects')}
        </Link>
        <h2 className="sidebar-title">{project.name}</h2>
        <nav className="sidebar-nav">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <SyncNowButton />
          <Link to="/cloud">{t('layout.configureCloud')}</Link>
          {lastSync && !syncMsg && (
            <div className="sync-msg">☁️ {t('layout.lastSync', { date: new Date(lastSync.at).toLocaleString(dateLocale) })}</div>
          )}
          {syncMsg && <div className="sync-msg">{syncMsg}</div>}
        </div>
      </aside>
      <section className="project-content">
        <Outlet />
      </section>
    </div>
  )
}
