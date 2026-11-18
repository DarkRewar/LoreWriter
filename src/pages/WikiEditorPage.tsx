import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../db'
import { useProjectId, useSaveFlush } from '../hooks'
import { RichTextEditor } from '../components/RichTextEditor'
import { wordCount } from '../lib/text'
import { serializeWikiFile } from '../lib/markdown'
import { downloadFile } from '../lib/queries'

export default function WikiEditorPage() {
  const projectId = useProjectId()
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
    if (!entry || !window.confirm(`Supprimer l'entrée « ${entry.title || 'sans titre'} » ?`)) return
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
        <p>Entrée introuvable.</p>
        <Link to={`/projects/${projectId}/wiki`}>← Retour au wiki</Link>
      </div>
    )
  }

  return (
    <div className="page novel-page">
      <div className="toolbar">
        <Link className="btn" to={`/projects/${projectId}/wiki`}>
          ← Wiki
        </Link>
        <h1 style={{ margin: 0, flex: 1 }}>📚 Wiki</h1>
        <button type="button" className="btn" onClick={download} title="Télécharger l’entrée en Markdown (.md)">
          ⬇️ .md
        </button>
        <button type="button" className="btn btn-danger" onClick={remove}>
          🗑 Supprimer
        </button>
      </div>

      <div className="writing-sheet">
        <input
          type="text"
          className="chapter-title"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="Intitulé de l’entrée (ex. : Aubeval, le Royaume…)"
        />
        <RichTextEditor
          content={content}
          onUpdate={onContent}
          placeholder="Décris ce terme de l’univers ici… origine, histoire, coutumes…"
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
    </div>
  )
}
