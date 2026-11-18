import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useProjectId } from '../hooks'
import { searchProject } from '../lib/queries'
import { SEARCH_KINDS, searchKindLabel, type SearchResult } from '../lib/search'
import { useI18n } from '../i18n'

export default function SearchPage() {
  const { t } = useI18n()
  const projectId = useProjectId()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '')
  }, [searchParams])

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }
    setSearching(true)
    const timer = setTimeout(() => {
      searchProject(projectId, q)
        .then((r) => {
          setResults(r)
          setSearching(false)
        })
        .catch(() => setSearching(false))
    }, 200)
    return () => clearTimeout(timer)
  }, [projectId, query])

  const grouped = (SEARCH_KINDS)
    .map((kind) => ({ kind, items: results.filter((r) => r.kind === kind) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="page search-page">
      <h1>{t('search.pageTitle')}</h1>
      <input
        className="search-input"
        type="text"
        autoFocus
        autoComplete="off"
        spellCheck={false}
        placeholder={t('search.pagePlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {query.trim() === '' ? (
        <p className="muted">{t('search.hint')}</p>
      ) : searching ? (
        <p className="muted">{t('search.searching')}</p>
      ) : results.length === 0 ? (
        <p className="muted">{t('search.noResult', { q: query.trim() })}</p>
      ) : (
        <>
          <p className="muted">{t('search.results', { n: results.length })}</p>
          {grouped.map((g) => (
            <div className="result-group" key={g.kind}>
              <h2>
                {searchKindLabel(g.kind)} ({g.items.length})
              </h2>
              {g.items.map((r) => (
                <Link key={`${r.kind}-${r.id}`} className="result" to={`/projects/${projectId}/${r.path}`}>
                  <div className="r-title">{r.title}</div>
                  {r.subtitle && <div className="r-sub">{r.subtitle}</div>}
                  <div className="r-snippet">{r.snippet}</div>
                </Link>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
