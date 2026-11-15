import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useProjectId } from '../hooks'
import { newId } from '../lib/ids'
import { RichTextEditor } from '../components/RichTextEditor'
import { wordCount } from '../lib/text'

export default function NovelPage() {
  const projectId = useProjectId()
  const chapters = useLiveQuery(
    () => db.chapters.where('projectId').equals(projectId).sortBy('order'),
    [projectId],
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focus, setFocus] = useState(false)
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')

  const selected = useMemo(() => {
    if (!chapters || chapters.length === 0) return null
    return chapters.find((c) => c.id === selectedId) ?? chapters[0]
  }, [chapters, selectedId])

  useEffect(() => {
    if (selected) {
      setContent(selected.content)
      setTitle(selected.title)
    }
  }, [selected?.id])

  const save = useMemo(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    return (id: string, t: string, html: string) => {
      clearTimeout(timer)
      timer = setTimeout(async () => {
        await db.chapters.update(id, { title: t, content: html, updatedAt: Date.now() })
        await db.projects.update(projectId, { updatedAt: Date.now() })
      }, 400)
    }
  }, [projectId])

  const onContent = (html: string) => {
    setContent(html)
    if (selected) save(selected.id, title, html)
  }
  const onTitle = (t: string) => {
    setTitle(t)
    if (selected) save(selected.id, t, content)
  }

  const addChapter = async () => {
    const now = Date.now()
    const id = newId()
    const order = chapters && chapters.length > 0 ? Math.max(...chapters.map((c) => c.order)) + 1 : 0
    await db.chapters.add({
      id,
      projectId,
      title: `Chapitre ${order + 1}`,
      content: '',
      order,
      createdAt: now,
      updatedAt: now,
    })
    await db.projects.update(projectId, { updatedAt: now })
    setSelectedId(id)
  }

  const removeChapter = async (id: string) => {
    if (!window.confirm('Supprimer ce chapitre ?')) return
    await db.chapters.delete(id)
    await db.projects.update(projectId, { updatedAt: Date.now() })
    setSelectedId(null)
  }

  return (
    <div className="page">
      <div className="toolbar">
        <h1 style={{ margin: 0 }}>Roman</h1>
        <span className="muted">
          {chapters?.length ?? 0} chapitre{chapters && chapters.length > 1 ? 's' : ''}
        </span>
        <div className="btn-row" style={{ marginLeft: 'auto' }}>
          <button type="button" className="btn" onClick={() => setFocus((f) => !f)} title="Masquer la liste des chapitres pour écrire en plein écran">
            {focus ? '📖 Voir les chapitres' : '✍️ Mode écriture'}
          </button>
          <button type="button" className="btn btn-primary" onClick={addChapter}>
            + Nouveau chapitre
          </button>
        </div>
      </div>

      <div className={`novel-layout${focus ? ' focus' : ''}`}>
        {!focus && (
          <div className="panel">
            <h2>Chapitres ({chapters?.length ?? 0})</h2>
            {!chapters || chapters.length === 0 ? (
              <p className="muted">Aucun chapitre.</p>
            ) : (
              <div className="chapter-list">
                {chapters.map((c, i) => (
                  <div
                    key={c.id}
                    className={`chapter-item${selected?.id === c.id ? ' active' : ''}`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <span className="title">
                      {i + 1}. {c.title || 'Sans titre'}
                    </span>
                    <span className="words">{wordCount(c.content)} mots</span>
                    <button
                      type="button"
                      className="btn-icon"
                      title="Supprimer le chapitre"
                      onClick={(e) => {
                        e.stopPropagation()
                        void removeChapter(c.id)
                      }}
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selected ? (
          <div className="writing-sheet">
            <input
              type="text"
              className="chapter-title"
              value={title}
              onChange={(e) => onTitle(e.target.value)}
              placeholder="Titre du chapitre"
            />
            <RichTextEditor
              content={content}
              onUpdate={onContent}
              placeholder="Écris ce chapitre ici… respire, prends ton temps."
              footer={
                <>
                  <span>
                    {wordCount(content)} mot{wordCount(content) > 1 ? 's' : ''}
                  </span>
                  <span>✓ enregistré automatiquement</span>
                </>
              }
            />
          </div>
        ) : (
          <div className="panel">
            <p className="muted">Créez un chapitre pour commencer à écrire. ✨</p>
          </div>
        )}
      </div>
    </div>
  )
}
