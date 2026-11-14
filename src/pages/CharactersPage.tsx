import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../db'
import { useProjectId } from '../hooks'
import { CharacterAvatar } from '../components/CharacterAvatar'
import { characterDisplayName } from '../types'
import { computeAge } from '../lib/age'
import { normalizeForSearch } from '../lib/text'

export default function CharactersPage() {
  const projectId = useProjectId()
  const characters = useLiveQuery(
    () => db.characters.where('projectId').equals(projectId).toArray(),
    [projectId],
  )
  const [filter, setFilter] = useState('')

  const sorted = useMemo(() => {
    const list = (characters ?? []).slice()
    list.sort((a, b) => characterDisplayName(a).localeCompare(characterDisplayName(b), 'fr'))
    const q = normalizeForSearch(filter).text
    if (!q) return list
    return list.filter((c) =>
      normalizeForSearch(
        [characterDisplayName(c), c.nickname, c.role, c.tags.join(' '), c.description].join(' '),
      ).text.includes(q),
    )
  }, [characters, filter])

  return (
    <div className="page">
      <div className="toolbar">
        <h1 style={{ margin: 0, flex: '0 0 auto' }}>Personnages</h1>
        <input
          className="search-input"
          type="text"
          placeholder="Filtrer par nom, surnom, tag, rôle…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <Link className="btn btn-primary" to={`/projects/${projectId}/characters/new`}>
          + Nouveau personnage
        </Link>
      </div>

      {sorted.length === 0 ? (
        <p className="muted">
          {characters && characters.length > 0
            ? 'Aucun personnage ne correspond au filtre.'
            : 'Aucun personnage pour l\'instant. Créez le premier !'}
        </p>
      ) : (
        <div className="character-list">
          {sorted.map((c) => {
            const age = c.birthDate ? computeAge(c.birthDate) : c.manualAge
            return (
              <Link key={c.id} className="character-row" to={`/projects/${projectId}/characters/${c.id}`}>
                <CharacterAvatar character={c} size={44} />
                <span className="who">
                  <span className="name">{characterDisplayName(c)}</span>
                  {c.nickname && <span className="sub"> « {c.nickname} »</span>}
                  {c.role && <span className="sub"> · {c.role}</span>}
                  {age !== null && <span className="sub"> · {age} an{age > 1 ? 's' : ''}</span>}
                  <br />
                  <span className="sub">{c.tags.join(' · ')}</span>
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
