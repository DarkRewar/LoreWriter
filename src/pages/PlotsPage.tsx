import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../db'
import { useProjectId } from '../hooks'
import type { PlotStatus } from '../types'
import { useConfirm } from '../components/ConfirmDialog'
import { useI18n, type MessageKey } from '../i18n'
import { addTombstone } from '../lib/tombstones'

const STATUS_KEYS: Record<PlotStatus, MessageKey> = {
  idea: 'plots.status.idea',
  draft: 'plots.status.draft',
  wip: 'plots.status.wip',
  done: 'plots.status.done',
}

export default function PlotsPage() {
  const confirm = useConfirm()
  const { t } = useI18n()
  const projectId = useProjectId()
  const plots = useLiveQuery(
    () => db.plots.where('projectId').equals(projectId).toArray(),
    [projectId],
  )

  const remove = async (id: string, title: string) => {
    if (await confirm({ message: t('plots.deleteConfirm', { title }) })) {
      await addTombstone(projectId, 'plot', id)
      await db.plots.delete(id)
      await db.projects.update(projectId, { updatedAt: Date.now() })
    }
  }

  return (
    <div className="page">
      <div className="toolbar">
        <h1 style={{ margin: 0 }}>{t('plots.title')}</h1>
        <Link className="btn btn-primary" style={{ marginLeft: 'auto' }} to={`/projects/${projectId}/plots/new`}>
          {t('plots.new')}
        </Link>
      </div>

      {!plots || plots.length === 0 ? (
        <p className="muted">{t('plots.none')}</p>
      ) : (
        <div className="character-list">
          {plots
            .slice()
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((p) => (
              <div key={p.id} className="character-row">
                <span className="who">
                  <Link className="name" to={`/projects/${projectId}/plots/${p.id}`}>
                    🧩 {p.title || t('plots.untitled')}
                  </Link>
                  <br />
                  <span className="sub">
                    {p.synopsis ? `${p.synopsis.slice(0, 90)}${p.synopsis.length > 90 ? '…' : ''} · ` : ''}
                    {p.tags.join(' · ')}
                  </span>
                </span>
                <span className={`badge ${p.status}`}>{t(STATUS_KEYS[p.status])}</span>
                <button type="button" className="btn-icon" aria-label={t('plots.deleteAria')} onClick={() => void remove(p.id, p.title)}>
                  🗑
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
