import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../db'
import { useMentionItems, useProjectId, useSaveFlush } from '../hooks'
import { RichTextEditor } from '../components/RichTextEditor'
import { wordCount } from '../lib/text'
import { serializeWikiFile } from '../lib/markdown'
import { downloadFile } from '../lib/queries'
import { useConfirm } from '../components/ConfirmDialog'
import { addTombstone } from '../lib/tombstones'
import { useI18n } from '../i18n'

export default function WikiEditorPage() {
  const confirm = useConfirm()
  const { t } = useI18n()
  const projectId = useProjectId()
  const mentionItems = useMentionItems()
  const { entryId } = useParams()
  const navigate = useNavigate()
  const entry = useLiveQuery(() => (entryId ? db.wikiEntries.get(entryId) : undefined), [entryId])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (entry) {
      setTitle(entry.title)
      setContent(entry.content)
    }
  }, [entry?.id])

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingRef = useRef<{ id: string; title: string; content: string } | null>(null)
  const writeEntry = useCallback(
    async (p: { id: string; title: string; content: string }) => {
      await db.wikiEntries.update(p.id, { title: p.title, content: p.content, updatedAt: Date.now() })
      await db.projects.update(projectId, { updatedAt: Date.now() })
    },
    [projectId],
  )
  const flush = useCallback(() => {
    clearTimeout(timerRef.current)
    const p = pendingRef.current
    if (p) {
      pendingRef.current = null
      void writeEntry(p)
    }
  }, [writeEntry])
  useSaveFlush(flush)

  const save = useCallback(
    (id: string, t: string, html: string) => {
      pendingRef.current = { id, title: t, content: html }
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const p = pendingRef.current
        if (p) {
          pendingRef.current = null
          void writeEntry(p)
        }
      }, 400)
    },
    [writeEntry],
  )

  const onContent = (html: string) => {
    setContent(html)
    if (entry) save(entry.id, title, html)
  }
  const onTitle = (t: string) => {
    setTitle(t)
    if (entry) save(entry.id, t, content)
  }

  const remove = async () => {
    if (!entry) return
    if (!(await confirm({ message: t('wiki.deleteConfirm', { title: entry.title || t('wiki.untitled') }) }))) return
    await addTombstone(projectId, 'wiki', entry.id)
    await db.wikiEntries.delete(entry.id)
    await db.projects.update(projectId, { updatedAt: Date.now() })
    navigate(`/projects/${projectId}/wiki`)
  }

  const download = () => {
    if (!entry) return
    const base = (entry.title || 'wiki').replace(/[^\w-]+/g, '_')
    downloadFile(`${base}.md`, serializeWikiFile({ ...entry, title, content }), 'text/markdown;charset=utf-8')
  }

  if (!entry) {
    return (
      <div className="page">
        <p>{t('wiki.editor.notFound')}</p>
        <Link to={`/projects/${projectId}/wiki`}>{t('wiki.editor.backToWiki')}</Link>
      </div>
    )
  }

  return (
    <div className="page novel-page">
      <div className="toolbar">
        <Link className="btn" to={`/projects/${projectId}/wiki`}>{t('wiki.editor.back')}</Link>
        <h1 style={{ margin: 0, flex: 1 }}>{t('wiki.title')}</h1>
        <button type="button" className="btn" onClick={download} title={t('wiki.editor.downloadMd')}>
          ⬇️ .md
        </button>
        <button type="button" className="btn btn-danger" onClick={remove}>
          {t('wiki.editor.delete')}
        </button>
      </div>

      <div className="writing-sheet">
        <input
          type="text"
          className="chapter-title"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder={t('wiki.editor.titlePlaceholder')}
        />
        <RichTextEditor
          content={content}
          onUpdate={onContent}
          mentions={mentionItems}
          placeholder={t('wiki.editor.contentPlaceholder')}
          footer={
            <>
              <span>
                {t('wiki.editor.words', { n: wordCount(content), s: wordCount(content) > 1 ? 's' : '' })}
              </span>
              <span>{t('wiki.editor.savedAuto')}</span>
            </>
          }
        />
      </div>
    </div>
  )
}
