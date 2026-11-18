import { useEffect, useState } from 'react'
import { NavLink, Link, Outlet } from 'react-router-dom'
import { useProject, useProjectId } from '../hooks'
import { loadCloudConfig, lastSyncStatus, syncProjectWithCloud, type SyncStatus } from '../lib/cloud'
import { projectNavItems } from '../nav'

const ACTION_LABELS: Record<SyncStatus['action'], string> = {
  pushed: 'envoyé vers le cloud',
  'pulled-merged': 'fusionné avec le cloud',
  'up-to-date': 'déjà à jour',
  'nothing-remote': 'premier envoi vers le cloud',
}

export default function ProjectLayout() {
  const projectId = useProjectId()
  const project = useProject()
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<SyncStatus | null>(() => lastSyncStatus(projectId))

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const cfg = loadCloudConfig()
      if (!cfg?.enabled) return
      try {
        const st = await syncProjectWithCloud(projectId)
        if (cancelled) return
        setLastSync(st)
        setSyncMsg(`☁️ ${ACTION_LABELS[st.action]} à ${new Date(st.at).toLocaleTimeString('fr-FR')}`)
      } catch (err) {
        if (!cancelled) setSyncMsg(`☁️ erreur de synchro : ${err instanceof Error ? err.message : 'inconnue'}`)
      }
    }
    void run()
    const timer = setInterval(run, 60_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [projectId])

  if (!project) {
    return (
      <div className="page">
        <p>Projet introuvable.</p>
        <Link to="/">← Retour aux projets</Link>
      </div>
    )
  }

  const base = `/projects/${projectId}`
  const items = projectNavItems(base)

  return (
    <div className="project-layout">
      <aside className="sidebar">
        <Link to="/" className="sidebar-back">
          ← Tous les projets
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
          <Link to="/cloud">☁️ Configurer le cloud</Link>
          {lastSync && !syncMsg && (
            <div className="sync-msg">☁️ dernière synchro : {new Date(lastSync.at).toLocaleString('fr-FR')}</div>
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
