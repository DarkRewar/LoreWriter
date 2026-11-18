import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../db'
import { useProjectId } from '../hooks'
import { newId } from '../lib/ids'
import { characterDisplayName, type RelationshipType } from '../types'
import { isDuplicateRelationship, RELATIONSHIP_TYPE_VALUES, relationshipTypeInfo } from '../lib/relationships'
import { useI18n } from '../i18n'
import { RelationshipGraph } from '../components/RelationshipGraph'
import { useConfirm } from '../components/ConfirmDialog'
import { addTombstone } from '../lib/tombstones'

export default function RelationshipsPage() {
  const confirm = useConfirm()
  const { t, dateLocale } = useI18n()
  const projectId = useProjectId()
  const [view, setView] = useState<'list' | 'graph'>('list')

  const characters = useLiveQuery(
    () =>
      db.characters
        .where('projectId')
        .equals(projectId)
        .toArray()
        .then((list) => list.sort((a, b) => characterDisplayName(a).localeCompare(characterDisplayName(b), dateLocale))),
    [projectId],
  )
  const relationships = useLiveQuery(
    () => db.relationships.where('projectId').equals(projectId).toArray(),
    [projectId],
  )

  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [type, setType] = useState<RelationshipType>('friend')
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')

  const charName = (id: string) => {
    const c = characters?.find((x) => x.id === id)
    return c ? characterDisplayName(c) : t('characters.deletedChar')
  }

  const addRelationship = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!sourceId || !targetId) return setError(t('relations.errors.pickTwo'))
    if (sourceId === targetId) return setError(t('relations.errors.self'))
    if (relationships && isDuplicateRelationship(relationships, sourceId, targetId, type)) {
      return setError(t('relations.errors.duplicate'))
    }
    const now = Date.now()
    await db.relationships.add({
      id: newId(),
      projectId,
      sourceId,
      targetId,
      type,
      label: label.trim(),
      createdAt: now,
      updatedAt: now,
    })
    await db.projects.update(projectId, { updatedAt: now })
    setLabel('')
  }

  const removeRelationship = async (id: string) => {
    if (!(await confirm({ message: t('relations.deleteConfirm') }))) return
    await addTombstone(projectId, 'relationship', id)
    await db.relationships.delete(id)
    await db.projects.update(projectId, { updatedAt: Date.now() })
  }

  return (
    <div className="page">
      <div className="toolbar">
        <h1 style={{ margin: 0 }}>{t('relations.title')}</h1>
        <div className="view-toggle" style={{ marginLeft: 'auto' }}>
          <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
            {t('relations.list')}
          </button>
          <button type="button" className={view === 'graph' ? 'active' : ''} onClick={() => setView('graph')}>
            🕸️ {t('relations.graph')}
          </button>
        </div>
      </div>

      {view === 'graph' ? (
        <div key="graph" className="view-anim">
          <RelationshipGraph characters={characters ?? []} relationships={relationships ?? []} projectId={projectId} />
        </div>
      ) : (
        <div key="list" className="view-anim">
          <div className="panel">
            <h2>{t('relations.add')}</h2>
            <form className="rel-form" onSubmit={addRelationship}>
              <label className="field">
                <span>{t('relations.from')}</span>
                <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                  <option value="">{t('relations.choose')}</option>
                  {(characters ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {characterDisplayName(c)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t('relations.type')}</span>
                <select value={type} onChange={(e) => setType(e.target.value as RelationshipType)}>
                  {RELATIONSHIP_TYPE_VALUES.map((v) => {
                    const info = relationshipTypeInfo(v)
                    return (
                      <option key={v} value={v}>
                        {info.label}
                      </option>
                    )
                  })}
                </select>
              </label>
              <label className="field">
                <span>{t('relations.to')}</span>
                <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                  <option value="">{t('relations.choose')}</option>
                  {(characters ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {characterDisplayName(c)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t('relations.precision')}</span>
                <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('relations.precisionPlaceholder')} />
              </label>
              <button type="submit" className="btn btn-primary">
                {t('relations.addButton')}
              </button>
            </form>
            {error && <p className="form-error">{error}</p>}
          </div>

          <div className="panel">
            <h2>{t('relations.all', { n: relationships?.length ?? 0 })}</h2>
            {!relationships || relationships.length === 0 ? (
              <p className="muted">{t('relations.none')}</p>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>{t('relations.linkCol')}</th>
                    <th>{t('relations.typeCol')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {relationships.map((r) => {
                    const info = relationshipTypeInfo(r.type)
                    return (
                      <tr key={r.id}>
                        <td>
                          <Link to={`/projects/${projectId}/characters/${r.sourceId}`}>{charName(r.sourceId)}</Link>
                          {' '}
                          {r.label || info.label}{' '}
                          <Link to={`/projects/${projectId}/characters/${r.targetId}`}>{charName(r.targetId)}</Link>
                        </td>
                        <td>
                          <span className="badge" style={{ borderColor: info.color, color: info.color }}>
                            {info.label}
                          </span>
                        </td>
                        <td>
                          <button type="button" className="btn-icon" aria-label={t('relations.deleteAria')} onClick={() => void removeRelationship(r.id)}>
                            🗑
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
