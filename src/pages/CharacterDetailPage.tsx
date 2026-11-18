import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../db'
import { useProjectId } from '../hooks'
import { CharacterAvatar } from '../components/CharacterAvatar'
import { characterDisplayName } from '../types'
import { computeAge, formatDate } from '../lib/age'
import { relationshipTypeInfo } from '../lib/relationships'
import { useConfirm } from '../components/ConfirmDialog'
import { addTombstone } from '../lib/tombstones'
import { useI18n } from '../i18n'

export default function CharacterDetailPage() {
  const { t, dateLocale } = useI18n()
  const confirm = useConfirm()
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
        <p>{t('characters.notFound')}</p>
        <Link to={`/projects/${projectId}/characters`}>{t('characters.backToList')}</Link>
      </div>
    )
  }

  const name = characterDisplayName(character)
  const age = character.birthDate ? computeAge(character.birthDate) : character.manualAge
  const charName = (id: string) => {
    const c = allCharacters?.find((x) => x.id === id)
    return c ? characterDisplayName(c) : t('characters.deletedChar')
  }

  const onDelete = async () => {
    if (await confirm({ title: t('characters.deleteTitle'), message: t('characters.deleteMessage', { name }) })) {
      await db.transaction('rw', [db.characters, db.relationships, db.deletions], async () => {
        await addTombstone(projectId, 'character', character.id)
        const rels = await db.relationships
          .where('projectId')
          .equals(projectId)
          .filter((r) => r.sourceId === character.id || r.targetId === character.id)
          .toArray()
        for (const r of rels) await addTombstone(projectId, 'relationship', r.id)
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
        <Link to={`/projects/${projectId}/characters`}>← {t('characters.title')}</Link>
        <div className="btn-row" style={{ marginLeft: 'auto' }}>
          <Link className="btn btn-primary" to={`/projects/${projectId}/characters/${character.id}/edit`}>
            {t('common.edit')}
          </Link>
          <button type="button" className="btn btn-danger" onClick={onDelete}>
            {t('common.delete')}
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
            <h2>{t('characters.info')}</h2>
            <dl className="kv">
              <dt>{t('characters.fields.firstName')}</dt>
              <dd>{character.firstName || t('common.em')}</dd>
              <dt>{t('characters.fields.lastName')}</dt>
              <dd>{character.lastName || t('common.em')}</dd>
              <dt>{t('characters.fields.nickname')}</dt>
              <dd>{character.nickname || t('common.em')}</dd>
              <dt>{t('characters.fields.birthDate')}</dt>
              <dd>{character.birthDate ? formatDate(character.birthDate, dateLocale) : t('common.em')}</dd>
              <dt>{t('characters.fields.age')}</dt>
              <dd>{age !== null ? t('common.ageYears', { age, s: age > 1 ? 's' : '' }) : t('common.em')}</dd>
              <dt>{t('characters.fields.role')}</dt>
              <dd>{character.role || t('common.em')}</dd>
            </dl>
          </div>

          {character.metadata.length > 0 && (
            <div className="panel">
              <h2>{t('characters.metadata')}</h2>
              <dl className="kv">
                {character.metadata.map((m) => (
                  <span key={m.id} style={{ display: 'contents' }}>
                    <dt>{m.key || t('common.em')}</dt>
                    <dd>{m.value || t('common.em')}</dd>
                  </span>
                ))}
              </dl>
            </div>
          )}

          {character.description && (
            <div className="panel">
              <h2>{t('characters.notes')}</h2>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{character.description}</p>
            </div>
          )}

          <div className="panel">
            <h2>{t('characters.relations', { n: relationships?.length ?? 0 })}</h2>
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
                {t('characters.noRelations')}{' '}<Link to={`/projects/${projectId}/relations`}>{t('characters.addLinks')}</Link>{' '}
                {t('characters.withOthers')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
