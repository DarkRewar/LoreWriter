import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../db'
import { useProjectId } from '../hooks'
import { CharacterAvatar } from '../components/CharacterAvatar'
import { characterDisplayName } from '../types'
import { computeAge, formatDateFr } from '../lib/age'
import { relationshipTypeInfo } from '../lib/relationships'

export default function CharacterDetailPage() {
  const projectId = useProjectId()
  const { characterId } = useParams()
  const navigate = useNavigate()

  const character = useLiveQuery(() => (characterId ? db.characters.get(characterId) : undefined), [characterId])
  const relationships = useLiveQuery(
    () =>
      characterId
        ? db.relationships
            .where('projectId')
            .equals(projectId)
            .filter((r) => r.sourceId === characterId || r.targetId === characterId)
            .toArray()
        : [],
    [projectId, characterId],
  )
  const allCharacters = useLiveQuery(
    () => db.characters.where('projectId').equals(projectId).toArray(),
    [projectId],
  )

  if (!character) {
    return (
      <div className="page">
        <p>Personnage introuvable.</p>
        <Link to={`/projects/${projectId}/characters`}>← Retour à la liste</Link>
      </div>
    )
  }

  const name = characterDisplayName(character)
  const age = character.birthDate ? computeAge(character.birthDate) : character.manualAge
  const charName = (id: string) => {
    const c = allCharacters?.find((x) => x.id === id)
    return c ? characterDisplayName(c) : 'Personnage supprimé'
  }

  const onDelete = async () => {
    if (window.confirm(`Supprimer ${name} et toutes ses relations ?`)) {
      await db.transaction('rw', [db.characters, db.relationships], async () => {
        await db.characters.delete(character.id)
        await db.relationships
          .where('projectId')
          .equals(projectId)
          .filter((r) => r.sourceId === character.id || r.targetId === character.id)
          .delete()
      })
      navigate(`/projects/${projectId}/characters`)
    }
  }

  return (
    <div className="page">
      <div className="toolbar">
        <Link to={`/projects/${projectId}/characters`}>← Personnages</Link>
        <div className="btn-row" style={{ marginLeft: 'auto' }}>
          <Link className="btn btn-primary" to={`/projects/${projectId}/characters/${character.id}/edit`}>
            Modifier
          </Link>
          <button type="button" className="btn btn-danger" onClick={onDelete}>
            Supprimer
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-side">
          <CharacterAvatar character={character} size={120} />
          <h2 style={{ margin: 0, textAlign: 'center' }}>{name}</h2>
          {character.nickname && <span className="muted">« {character.nickname} »</span>}
          {character.role && <span className="badge">{character.role}</span>}
          {character.tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>

        <div>
          <div className="panel">
            <h2>Informations essentielles</h2>
            <dl className="kv">
              <dt>Prénom</dt>
              <dd>{character.firstName || '—'}</dd>
              <dt>Nom</dt>
              <dd>{character.lastName || '—'}</dd>
              <dt>Surnom</dt>
              <dd>{character.nickname || '—'}</dd>
              <dt>Date de naissance</dt>
              <dd>{character.birthDate ? formatDateFr(character.birthDate) : '—'}</dd>
              <dt>Âge</dt>
              <dd>{age !== null ? `${age} an${age > 1 ? 's' : ''}` : '—'}</dd>
              <dt>Rôle</dt>
              <dd>{character.role || '—'}</dd>
            </dl>
          </div>

          {character.metadata.length > 0 && (
            <div className="panel">
              <h2>Métadonnées</h2>
              <dl className="kv">
                {character.metadata.map((m) => (
                  <span key={m.id} style={{ display: 'contents' }}>
                    <dt>{m.key || '—'}</dt>
                    <dd>{m.value || '—'}</dd>
                  </span>
                ))}
              </dl>
            </div>
          )}

          {character.description && (
            <div className="panel">
              <h2>Notes</h2>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{character.description}</p>
            </div>
          )}

          <div className="panel">
            <h2>Relations ({relationships?.length ?? 0})</h2>
            {relationships && relationships.length > 0 ? (
              <table className="data">
                <tbody>
                  {relationships.map((r) => {
                    const info = relationshipTypeInfo(r.type)
                    const other = r.sourceId === character.id ? r.targetId : r.sourceId
                    const text =
                      r.sourceId === character.id
                        ? `${name} ${r.label || info.label} ${charName(other)}`
                        : `${charName(other)} ${r.label || relationshipTypeInfo(info.inverse).label} ${name}`
                    return (
                      <tr key={r.id}>
                        <td>
                          <Link to={`/projects/${projectId}/characters/${other}`}>{text}</Link>
                        </td>
                        <td>
                          <span className="badge" style={{ borderColor: info.color, color: info.color }}>
                            {info.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <p className="muted">
                Aucune relation. <Link to={`/projects/${projectId}/relations`}>Ajouter des liens</Link> avec d'autres
                personnages.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
