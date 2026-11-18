import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../db'
import { useProjectId } from '../hooks'
import { newId } from '../lib/ids'
import { characterDisplayName, type RelationshipType } from '../types'
import { isDuplicateRelationship, RELATIONSHIP_TYPES, relationshipTypeInfo } from '../lib/relationships'
import { RelationshipGraph } from '../components/RelationshipGraph'
import { addTombstone } from '../lib/tombstones'

export default function RelationshipsPage() {
  const projectId = useProjectId()
  const [view, setView] = useState<'list' | 'graph'>('list')

  const characters = useLiveQuery(
    () =>
      db.characters
        .where('projectId')
        .equals(projectId)
        .toArray()
        .then((list) => list.sort((a, b) => characterDisplayName(a).localeCompare(characterDisplayName(b), 'fr'))),
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
    return c ? characterDisplayName(c) : 'Personnage supprimé'
  }

  const addRelationship = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!sourceId || !targetId) return setError('Choisis deux personnages.')
    if (sourceId === targetId) return setError('Un personnage ne peut pas avoir de relation avec lui-même.')
    if (relationships && isDuplicateRelationship(relationships, sourceId, targetId, type)) {
      return setError('Cette relation existe déjà entre ces deux personnages.')
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
    await addTombstone(projectId, 'relationship', id)
    await db.relationships.delete(id)
    await db.projects.update(projectId, { updatedAt: Date.now() })
  }

  return (
    <div className="page">
      <div className="toolbar">
        <h1 style={{ margin: 0 }}>Relations</h1>
        <div className="view-toggle" style={{ marginLeft: 'auto' }}>
          <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
            ☰ Liste
          </button>
          <button type="button" className={view === 'graph' ? 'active' : ''} onClick={() => setView('graph')}>
            🕸️ Diagramme
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
            <h2>Ajouter une relation</h2>
            <form className="rel-form" onSubmit={addRelationship}>
              <label className="field">
                <span>Personnage</span>
                <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                  <option value="">— choisir —</option>
                  {(characters ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {characterDisplayName(c)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Type de lien</span>
                <select value={type} onChange={(e) => setType(e.target.value as RelationshipType)}>
                  {RELATIONSHIP_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Personnage lié</span>
                <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                  <option value="">— choisir —</option>
                  {(characters ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {characterDisplayName(c)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Précision (optionnel)</span>
                <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. : cousins éloignés" />
              </label>
              <button type="submit" className="btn btn-primary">
                Ajouter
              </button>
            </form>
            {error && <p className="form-error">{error}</p>}
          </div>

          <div className="panel">
            <h2>Toutes les relations ({relationships?.length ?? 0})</h2>
            {!relationships || relationships.length === 0 ? (
              <p className="muted">Aucune relation pour l'instant.</p>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>Lien</th>
                    <th>Type</th>
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
                          <button type="button" className="btn-icon" aria-label="Supprimer la relation" onClick={() => void removeRelationship(r.id)}>
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
