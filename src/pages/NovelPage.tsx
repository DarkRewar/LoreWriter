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
import { useI18n } from '../i18n'

export default function NovelPage() {
  const confirm = useConfirm()
  const { t } = useI18n()
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
      title: t('novels.chapterDefault', { n: order + 1 }),
      content: '',
      order,
      createdAt: now,
      updatedAt: now,
    })
    await db.projects.update(projectId, { updatedAt: now })
    setSelectedId(id)
  }

  const removeChapter = async (id: string) => {
    if (!(await confirm({ message: t('novels.deleteChapterConfirm') }))) return
    await addTombstone(projectId, 'chapter', id)
    await db.chapters.delete(id)
    await db.projects.update(projectId, { updatedAt: Date.now() })
    setSelectedId(null)
  }

  const downloadChapter = (c: Chapter) => {
    const base = (c.title || t('novels.downloadBase')).replace(/[^\w-]+/g, '_')
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
    const title = window.prompt(t('novels.renamePrompt'), n.title)
    if (!title || !title.trim() || title.trim() === n.title) return
    await db.novels.update(n.id, { title: title.trim(), updatedAt: Date.now() })
    await db.projects.update(projectId, { updatedAt: Date.now() })
  }

  const removeNovel = async (n: Novel) => {
    const count = chaptersCount(n.id)
    if (!(await confirm({ title: t('novels.deleteNovelTitle'), message: t('novels.deleteNovelConfirm', { title: n.title, count }) }))) return
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
        <h1 style={{ margin: 0 }}>{t('novels.title')}</h1>
        <span className="muted">
          {t('novels.count', {
            novels: novels?.length ?? 0,
            sNovels: novels && novels.length > 1 ? 's' : '',
            chapters: chapters?.length ?? 0,
            sChapters: chapters && chapters.length > 1 ? 's' : '',
          })}
        </span>
        <div className="btn-row" style={{ marginLeft: 'auto' }}>
          <button type="button" className="btn" onClick={() => setFocus((f) => !f)} title={t('novels.focusHide')}>
            {focus ? t('novels.showList') : t('novels.writingMode')}
          </button>
          <button type="button" className="btn btn-primary" onClick={addChapter} disabled={!selectedNovel}>
            {t('novels.newChapter')}
          </button>
        </div>
      </div>

      <div className={`novel-layout${focus ? ' focus' : ''}`}>
        {!focus && (
          <div className="panel">
            <div className="panel-head">
              <h2 style={{ margin: 0 }}>{t('novels.panelTitle', { n: novels?.length ?? 0 })}</h2>
              <button
                type="button"
                className="btn-icon"
                title={panelOpen ? t('novels.collapse') : t('novels.expand')}
                aria-expanded={panelOpen}
                onClick={() => setPanelOpen((o) => !o)}
              >
                {panelOpen ? '▾' : '▸'}
              </button>
            </div>
            {panelOpen && (
            <>
            {!novels || novels.length === 0 ? (
              <p className="muted">{t('novels.none')}</p>
            ) : (
              <div className="chapter-list">
                {novels.map((n) => (
                  <div
                    key={n.id}
                    className={`chapter-item${selectedNovel?.id === n.id ? ' active' : ''}`}
                    onClick={() => setSelectedNovelId(n.id)}
                  >
                    <span className="title">📖 {n.title || t('novels.untitled')}</span>
                    <span className="words">{t('novels.chCount', { n: novelChapters(n.id).length })}</span>
                    <button
                      type="button"
                      className="btn-icon"
                      title={t('novels.renameNovel')}
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
                      title={t('novels.deleteNovelAria')}
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
                placeholder={t('novels.newNovelPlaceholder')}
                value={newNovelTitle}
                onChange={(e) => setNewNovelTitle(e.target.value)}
                style={{ flex: 1, minWidth: 120 }}
              />
              <button type="submit" className="btn">
                {t('novels.addNovel')}
              </button>
            </form>

            <h2 style={{ marginTop: 18 }}>{t('novels.chaptersOf', { title: selectedNovel?.title || '…', n: chapters?.length ?? 0 })}</h2>
            {!chapters || chapters.length === 0 ? (
              <p className="muted">{t('novels.noChapters')}</p>
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
                      {i + 1}. {c.title || t('novels.untitled')}
                    </span>
                    <span className="words">{t('novels.words', { n: wordCount(c.content) })}</span>
                    <button
                      type="button"
                      className="btn-icon"
                      title={t('novels.downloadChapter')}
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
                      title={t('common.delete')}
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
              placeholder={t('novels.chapterTitlePlaceholder')}
            />
            <RichTextEditor
              content={content}
              onUpdate={onContent}
              mentions={mentionItems}
              placeholder={t('novels.chapterPlaceholder')}
              footer={
                <>
                  <span>
                    {t('wiki.editor.words', { n: wordCount(content), s: wordCount(content) > 1 ? 's' : '' })}
                  </span>
                  <span>{t('novels.savedAuto')}</span>
                </>
              }
            />
          </div>
        ) : (
          <div className="panel">
            <p className="muted">
              {selectedNovel ? t('novels.createChapterFirst') : t('novels.createNovelFirst')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
