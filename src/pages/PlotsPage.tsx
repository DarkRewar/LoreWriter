import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../db'
import { useProjectId } from '../hooks'
import type { PlotStatus } from '../types'
import { addTombstone } from '../lib/tombstones'

const STATUS_LABELS: Record<PlotStatus, string> = {
  idea: '💡 Idée',
  draft: '📝 Brouillon',
  wip: '🔥 En cours',
  done: '✅ Terminée',
}

export default function PlotsPage() {
  const projectId = useProjectId()
  const plots = useLiveQuery(
    () => db.plots.where('projectId').equals(projectId).toArray(),
    [projectId],
  )

  const remove = async (id: string, title: string) => {
    if (window.confirm(`Supprimer l'intrigue « ${title} » ?`)) {
      await addTombstone(projectId, 'plot', id)
      await db.plots.delete(id)
      await db.projects.update(projectId, { updatedAt: Date.now() })
    }
  }

  return (
    <div className="page">
      <div className="toolbar">
        <h1 style={{ margin: 0 }}>Intrigues</h1>
        <Link className="btn btn-primary" style={{ marginLeft: 'auto' }} to={`/projects/${projectId}/plots/new`}>
          + Nouvelle intrigue
        </Link>
      </div>

      {!plots || plots.length === 0 ? (
        <p className="muted">Aucune intrigue pour l'instant — structurez votre récit !</p>
      ) : (
        <div className="character-list">
          {plots
            .slice()
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((p) => (
              <div key={p.id} className="character-row">
                <span className="who">
                  <Link className="name" to={`/projects/${projectId}/plots/${p.id}`}>
                    🧩 {p.title || 'Sans titre'}
                  </Link>
                  <br />
                  <span className="sub">
                    {p.synopsis ? `${p.synopsis.slice(0, 90)}${p.synopsis.length > 90 ? '…' : ''} · ` : ''}
                    {p.tags.join(' · ')}
                  </span>
                </span>
                <span className={`badge ${p.status}`}>{STATUS_LABELS[p.status]}</span>
                <button type="button" className="btn-icon" aria-label="Supprimer l'intrigue" onClick={() => void remove(p.id, p.title)}>
                  🗑
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
