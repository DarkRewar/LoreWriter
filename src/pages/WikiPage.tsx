import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../db'
import { useProjectId } from '../hooks'
import { newId } from '../lib/ids'
import { downloadFile } from '../lib/queries'
import { serializeWikiFile } from '../lib/markdown'
import { normalizeForSearch, stripHtml } from '../lib/text'
import type { WikiEntry } from '../types'
import { useConfirm } from '../components/ConfirmDialog'
import { useI18n } from '../i18n'
import { addTombstone } from '../lib/tombstones'

export default function WikiPage() {
  const { t } = useI18n()
  const confirm = useConfirm()
  const projectId = useProjectId()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const entries = useLiveQuery(() => db.wikiEntries.where('projectId').equals(projectId).toArray(), [projectId])

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query).text
    const list = (entries ?? []).slice().sort((a, b) => b.updatedAt - a.updatedAt)
    if (!q) return list
    return list.filter(
      (e) =>
        normalizeForSearch(e.title).text.includes(q) || normalizeForSearch(stripHtml(e.content)).text.includes(q),
    )
  }, [entries, query])

  const addEntry = async () => {
    const now = Date.now()
    const id = newId()
    await db.wikiEntries.add({ id, projectId, title: t('wiki.newEntry'), content: '', createdAt: now, updatedAt: now })
    await db.projects.update(projectId, { updatedAt: now })
    navigate(`/projects/${projectId}/wiki/${id}`)
  }

  const removeEntry = async (id: string, title: string) => {
    if (!(await confirm({ message: t('wiki.deleteConfirm', { title: title || t('wiki.untitled') }) }))) return
    await addTombstone(projectId, 'wiki', id)
    await db.wikiEntries.delete(id)
    await db.projects.update(projectId, { updatedAt: Date.now() })
  }

  const downloadEntry = (e: WikiEntry) => {
    const base = (e.title || 'wiki').replace(/[^\w-]+/g, '_')
    downloadFile(`${base}.md`, serializeWikiFile(e), 'text/markdown;charset=utf-8')
  }

  return (
    <div className="page">
      <div className="toolbar">
        <h1 style={{ margin: 0 }}>{t('wiki.title')}</h1>
        <span className="muted">{t('dashboard.wikiCount', { n: entries?.length ?? 0 })}</span>
        <input
          type="search"
          className="search-input"
          placeholder={t('wiki.filterPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ marginLeft: 'auto' }}
        />
        <button type="button" className="btn btn-primary" onClick={addEntry}>
          {t('wiki.newEntry')}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="panel">
          <p className="muted">
            {entries?.length ? t('wiki.emptyFiltered') : t('wiki.empty')}
          </p>
        </div>
      ) : (
        <div className="chapter-list">
          {filtered.map((e) => (
            <div key={e.id} className="chapter-item" onClick={() => navigate(`/projects/${projectId}/wiki/${e.id}`)}>
              <span className="title">📚 {e.title || t('wiki.untitled')}</span>
              <span className="words">{stripHtml(e.content).slice(0, 80)}</span>
              <button
                type="button"
                className="btn-icon"
                title={t('wiki.downloadEntry')}
                onClick={(ev) => {
                  ev.stopPropagation()
                  downloadEntry(e)
                }}
              >
                ⬇️
              </button>
              <button
                type="button"
                className="btn-icon"
                title={t('wiki.deleteEntryAria')}
                onClick={(ev) => {
                  ev.stopPropagation()
                  void removeEntry(e.id, e.title)
                }}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="muted" style={{ marginTop: 12 }}>
        <Link to={`/projects/${projectId}`}>← {t('app.projects')}</Link>
      </p>
    </div>
  )
}
