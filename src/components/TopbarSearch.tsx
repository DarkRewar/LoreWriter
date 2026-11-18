import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useMatch, useNavigate } from 'react-router-dom'
import { searchProject } from '../lib/queries'
import { searchKindLabel, type SearchResult } from '../lib/search'
import { useI18n } from '../i18n'

export default function TopbarSearch() {
  const match = useMatch('/projects/:projectId/*')
  const projectId = match?.params.projectId ?? ''
  const navigate = useNavigate()
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setQuery('')
    setResults([])
    setOpen(false)
  }, [projectId])

  useEffect(() => {
    const q = query.trim()
    if (!q || !projectId) {
      setResults([])
      return
    }
    const timer = setTimeout(() => {
      searchProject(projectId, q)
        .then((r) => {
          setResults(r.slice(0, 8))
          setOpen(true)
        })
        .catch(() => {})
    }, 180)
    return () => clearTimeout(timer)
  }, [query, projectId])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'Space' && projectId) {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [projectId])

  if (!projectId) return null

  const goToAll = () => {
    if (!query.trim()) return
    navigate(`/projects/${projectId}/search?q=${encodeURIComponent(query.trim())}`)
    setOpen(false)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    goToAll()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="topbar-search" ref={boxRef}>
      <form onSubmit={submit} autoComplete="off">
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          aria-label={t('search.aria')}
          title={t('search.title')}
        />
      </form>
      {open && query.trim() !== '' && (
        <div className="topbar-search-results">
          {results.length === 0 ? (
            <div className="ts-empty">{t('search.noResult', { q: query.trim() })}</div>
          ) : (
            results.map((r) => (
              <Link
                key={`${r.kind}-${r.id}`}
                to={`/projects/${projectId}/${r.path}`}
                onClick={() => {
                  setOpen(false)
                  setQuery('')
                }}
              >
                <span className="ts-kind">{searchKindLabel(r.kind)}</span>
                <span className="ts-title">{r.title}</span>
                <span className="ts-snippet">{r.snippet}</span>
              </Link>
            ))
          )}
          <button type="button" className="ts-all" onClick={goToAll}>
            {t('search.seeAll')}
          </button>
        </div>
      )}
    </div>
  )
}
