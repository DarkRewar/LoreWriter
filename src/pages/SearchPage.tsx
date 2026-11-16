import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useProjectId } from '../hooks'
import { searchProject } from '../lib/queries'
import { SEARCH_KIND_LABELS, type SearchKind, type SearchResult } from '../lib/search'

export default function SearchPage() {
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

  const grouped = (Object.keys(SEARCH_KIND_LABELS) as SearchKind[])
    .map((kind) => ({ kind, items: results.filter((r) => r.kind === kind) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="page search-page">
      <h1>Recherche</h1>
      <input
        className="search-input"
        type="text"
        autoFocus
        autoComplete="off"
        spellCheck={false}
        placeholder="Rechercher un personnage, une réplique, un chapitre, une intrigue…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {query.trim() === '' ? (
        <p className="muted">Tapez quelques mots pour retrouver instantanément tout le contenu du projet (insensible aux accents).</p>
      ) : searching ? (
        <p className="muted">Recherche en cours…</p>
      ) : results.length === 0 ? (
        <p className="muted">Aucun résultat pour « {query.trim()} ».</p>
      ) : (
        <>
          <p className="muted">{results.length} résultat(s)</p>
          {grouped.map((g) => (
            <div className="result-group" key={g.kind}>
              <h2>
                {SEARCH_KIND_LABELS[g.kind]} ({g.items.length})
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
