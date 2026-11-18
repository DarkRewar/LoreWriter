import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSearchParams } from 'react-router-dom'
import { db } from '../db'
import { useMentionItems, useProjectId, useSaveFlush } from '../hooks'
import { newId } from '../lib/ids'
import { RichTextEditor } from '../components/RichTextEditor'
import { wordCount } from '../lib/text'
import { serializeChapterFile } from '../lib/markdown'
import { downloadFile } from '../lib/queries'
import type { Chapter, Novel } from '../types'
import { useConfirm } from '../components/ConfirmDialog'
import { addTombstone } from '../lib/tombstones'

export default function NovelPage() {
  const confirm = useConfirm()
  const projectId = useProjectId()
  const mentionItems = useMentionItems()
  const [searchParams] = useSearchParams()
  const novelParam = searchParams.get('novel')

  const novels = useLiveQuery(
    () => db.novels.where('projectId').equals(projectId).sortBy('createdAt'),
    [projectId],
  )
  const [selectedNovelId, setSelectedNovelId] = useState<string | null>(null)
  const selectedNovel = useMemo(() => {
    if (!novels || novels.length === 0) return null
    return novels.find((n) => n.id === selectedNovelId) ?? novels.find((n) => n.id === novelParam) ?? novels[0]
  }, [novels, selectedNovelId, novelParam])

  const allChapters = useLiveQuery(
    () => db.chapters.where('projectId').equals(projectId).toArray(),
    [projectId],
  )
  const chapters = useLiveQuery(
    () =>
      selectedNovel
        ? db.chapters.where('novelId').equals(selectedNovel.id).sortBy('order')
        : Promise.resolve([] as Chapter[]),
    [selectedNovel?.id],
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focus, setFocus] = useState(false)
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [newNovelTitle, setNewNovelTitle] = useState('')
  const [panelOpen, setPanelOpen] = useState(true)

  const selected = useMemo(() => {
    if (!chapters || chapters.length === 0) return null
    return chapters.find((c) => c.id === selectedId) ?? chapters[0]
  }, [chapters, selectedId])

  useEffect(() => {
    setSelectedId(null)
  }, [selectedNovel?.id])

  useEffect(() => {
    if (selected) {
      setContent(selected.content)
      setTitle(selected.title)
    }
  }, [selected?.id])

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingRef = useRef<{ id: string; title: string; content: string } | null>(null)
  const writeChapter = useCallback(
    async (p: { id: string; title: string; content: string }) => {
      await db.chapters.update(p.id, { title: p.title, content: p.content, updatedAt: Date.now() })
      await db.projects.update(projectId, { updatedAt: Date.now() })
    },
    [projectId],
  )
  const flush = useCallback(() => {
    clearTimeout(timerRef.current)
    const p = pendingRef.current
    if (p) {
      pendingRef.current = null
      void writeChapter(p)
    }
  }, [writeChapter])
  useSaveFlush(flush)

  const save = useCallback(
    (id: string, t: string, html: string) => {
      pendingRef.current = { id, title: t, content: html }
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const p = pendingRef.current
        if (p) {
          pendingRef.current = null
          void writeChapter(p)
        }
      }, 400)
    },
    [writeChapter],
  )

  const onContent = (html: string) => {
    setContent(html)
    if (selected) save(selected.id, title, html)
  }
  const onTitle = (t: string) => {
    setTitle(t)
    if (selected) save(selected.id, t, content)
  }

  const addChapter = async () => {
    if (!selectedNovel) return
    const now = Date.now()
    const id = newId()
    const order = chapters && chapters.length > 0 ? Math.max(...chapters.map((c) => c.order)) + 1 : 0
    await db.chapters.add({
      id,
      projectId,
      novelId: selectedNovel.id,
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
    if (!(await confirm({ message: 'Supprimer ce chapitre ?' }))) return
    await addTombstone(projectId, 'chapter', id)
    await db.chapters.delete(id)
    await db.projects.update(projectId, { updatedAt: Date.now() })
    setSelectedId(null)
  }

  const downloadChapter = (c: Chapter) => {
    const base = (c.title || 'chapitre').replace(/[^\w-]+/g, '_')
    downloadFile(`${base}.md`, serializeChapterFile(c), 'text/markdown;charset=utf-8')
  }

  const addNovel = async (e: FormEvent) => {
    e.preventDefault()
    const t = newNovelTitle.trim()
    if (!t) return
    const now = Date.now()
    const id = newId()
    await db.novels.add({ id, projectId, title: t, createdAt: now, updatedAt: now })
    await db.projects.update(projectId, { updatedAt: now })
    setNewNovelTitle('')
    setSelectedNovelId(id)
  }

  const renameNovel = async (n: Novel) => {
    const t = window.prompt('Nouveau titre du roman :', n.title)
    if (!t || !t.trim() || t.trim() === n.title) return
    await db.novels.update(n.id, { title: t.trim(), updatedAt: Date.now() })
    await db.projects.update(projectId, { updatedAt: Date.now() })
  }

  const removeNovel = async (n: Novel) => {
    const count = chaptersCount(n.id)
    if (!(await confirm({ title: 'Supprimer le roman', message: `Supprimer le roman « ${n.title} » et ses ${count} chapitre(s) ?` }))) return
    await db.transaction('rw', [db.novels, db.chapters], async () => {
      await addTombstone(projectId, 'novel', n.id)
      const chIds = (allChapters ?? []).filter((c) => c.novelId === n.id).map((c) => c.id)
      for (const cid of chIds) await addTombstone(projectId, 'chapter', cid)
      await db.novels.delete(n.id)
      await db.chapters.where('novelId').equals(n.id).delete()
    })
    await db.projects.update(projectId, { updatedAt: Date.now() })
    if (selectedNovel?.id === n.id) setSelectedNovelId(null)
  }

  const chaptersCount = (novelId: string): number => (allChapters ?? []).filter((c) => c.novelId === novelId).length

  const novelChapters = (novelId: string): Chapter[] => (allChapters ?? []).filter((c) => c.novelId === novelId)

  return (
    <div className="page novel-page">
      <div className="toolbar">
        <h1 style={{ margin: 0 }}>Romans</h1>
        <span className="muted">
          {novels?.length ?? 0} roman{novels && novels.length > 1 ? 's' : ''} · {chapters?.length ?? 0} chapitre
          {chapters && chapters.length > 1 ? 's' : ''}
        </span>
        <div className="btn-row" style={{ marginLeft: 'auto' }}>
          <button type="button" className="btn" onClick={() => setFocus((f) => !f)} title="Masquer la liste pour écrire en plein écran">
            {focus ? '📖 Voir la liste' : '✍️ Mode écriture'}
          </button>
          <button type="button" className="btn btn-primary" onClick={addChapter} disabled={!selectedNovel}>
            + Nouveau chapitre
          </button>
        </div>
      </div>

      <div className={`novel-layout${focus ? ' focus' : ''}`}>
        {!focus && (
          <div className="panel">
            <div className="panel-head">
              <h2 style={{ margin: 0 }}>Romans ({novels?.length ?? 0})</h2>
              <button
                type="button"
                className="btn-icon"
                title={panelOpen ? 'Replier la liste romans/chapitres' : 'Déplier la liste romans/chapitres'}
                aria-expanded={panelOpen}
                onClick={() => setPanelOpen((o) => !o)}
              >
                {panelOpen ? '▾' : '▸'}
              </button>
            </div>
            {panelOpen && (
            <>
            {!novels || novels.length === 0 ? (
              <p className="muted">Aucun roman.</p>
            ) : (
              <div className="chapter-list">
                {novels.map((n) => (
                  <div
                    key={n.id}
                    className={`chapter-item${selectedNovel?.id === n.id ? ' active' : ''}`}
                    onClick={() => setSelectedNovelId(n.id)}
                  >
                    <span className="title">📖 {n.title || 'Sans titre'}</span>
                    <span className="words">{novelChapters(n.id).length} ch.</span>
                    <button
                      type="button"
                      className="btn-icon"
                      title="Renommer le roman"
                      onClick={(e) => {
                        e.stopPropagation()
                        void renameNovel(n)
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      title="Supprimer le roman et ses chapitres"
                      onClick={(e) => {
                        e.stopPropagation()
                        void removeNovel(n)
                      }}
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={addNovel} className="btn-row" style={{ marginTop: 10 }}>
              <input
                type="text"
                placeholder="Titre du nouveau roman…"
                value={newNovelTitle}
                onChange={(e) => setNewNovelTitle(e.target.value)}
                style={{ flex: 1, minWidth: 120 }}
              />
              <button type="submit" className="btn">
                + Roman
              </button>
            </form>

            <h2 style={{ marginTop: 18 }}>Chapitres de « {selectedNovel?.title || '…'} » ({chapters?.length ?? 0})</h2>
            {!chapters || chapters.length === 0 ? (
              <p className="muted">Aucun chapitre dans ce roman.</p>
            ) : (
              <div className="chapter-list">
                {chapters.map((c, i) => (
                  <div
                    key={c.id}
                    className={`chapter-item${selected?.id === c.id ? ' active' : ''}`}
                    onClick={() => {
                      setSelectedId(c.id)
                      if (window.innerWidth <= 860) setPanelOpen(false)
                    }}
                  >
                    <span className="title">
                      {i + 1}. {c.title || 'Sans titre'}
                    </span>
                    <span className="words">{wordCount(c.content)} mots</span>
                    <button
                      type="button"
                      className="btn-icon"
                      title="Télécharger ce chapitre (.md)"
                      onClick={(e) => {
                        e.stopPropagation()
                        downloadChapter(c)
                      }}
                    >
                      ⬇️
                    </button>
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
            </>
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
              mentions={mentionItems}
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
            <p className="muted">
              {selectedNovel ? 'Créez un chapitre pour commencer à écrire. ✨' : 'Créez un roman pour commencer. ✨'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
