import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../db'
import { useProjectId } from '../hooks'
import { newId } from '../lib/ids'
import type { Plot, PlotStatus } from '../types'
import { characterDisplayName } from '../types'
import { TagInput } from '../components/TagInput'

const STATUS_LABELS: Record<PlotStatus, string> = {
  idea: '💡 Idée',
  draft: '📝 Brouillon',
  wip: '🔥 En cours',
  done: '✅ Terminée',
}

export default function PlotEditorPage() {
  const projectId = useProjectId()
  const { plotId } = useParams()
  const isEdit = Boolean(plotId)
  const navigate = useNavigate()

  const existing = useLiveQuery(() => (plotId ? db.plots.get(plotId) : undefined), [plotId])
  const characters = useLiveQuery(
    () =>
      db.characters
        .where('projectId')
        .equals(projectId)
        .toArray()
        .then((list) => list.sort((a, b) => characterDisplayName(a).localeCompare(characterDisplayName(b), 'fr'))),
    [projectId],
  )

  const [draft, setDraft] = useState<Plot | null>(() => {
    if (isEdit) return null
    const now = Date.now()
    return {
      id: newId(),
      projectId,
      title: '',
      synopsis: '',
      status: 'idea',
      tags: [],
      characterIds: [],
      createdAt: now,
      updatedAt: now,
    }
  })

  useEffect(() => {
    if (isEdit && existing) setDraft({ ...existing })
  }, [isEdit, existing])

  if (isEdit && existing === null) {
    return (
      <div className="page">
        <p>Intrigue introuvable.</p>
        <Link to={`/projects/${projectId}/plots`}>← Retour aux intrigues</Link>
      </div>
    )
  }
  if (!draft) return <div className="page">Chargement…</div>

  const save = (next: Plot) => {
    setDraft(next)
    void db.plots.put({ ...next, updatedAt: Date.now() }).then(() => {
      void db.projects.update(projectId, { updatedAt: Date.now() })
    })
  }

  const toggleCharacter = (id: string) => {
    const has = draft.characterIds.includes(id)
    save({ ...draft, characterIds: has ? draft.characterIds.filter((x) => x !== id) : [...draft.characterIds, id] })
  }

  const onDelete = async () => {
    if (window.confirm(`Supprimer l'intrigue « ${draft.title || 'sans titre'} » ?`)) {
      await db.plots.delete(draft.id)
      navigate(`/projects/${projectId}/plots`)
    }
  }

  return (
    <div className="page">
      <div className="toolbar">
        <Link to={`/projects/${projectId}/plots`}>← Intrigues</Link>
        {isEdit && (
          <button type="button" className="btn btn-danger" style={{ marginLeft: 'auto' }} onClick={onDelete}>
            Supprimer
          </button>
        )}
      </div>

      <h1>{isEdit ? "Modifier l'intrigue" : 'Nouvelle intrigue'}</h1>
      <div style={{ maxWidth: 760 }}>
        <div className="panel">
          <label className="field">
            <span>Titre</span>
            <input type="text" value={draft.title} onChange={(e) => save({ ...draft, title: e.target.value })} placeholder="Ex. : La disparition du sceptre" />
          </label>
          <label className="field">
            <span>Statut</span>
            <select value={draft.status} onChange={(e) => save({ ...draft, status: e.target.value as PlotStatus })}>
              {(Object.keys(STATUS_LABELS) as PlotStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Synopsis</span>
            <textarea value={draft.synopsis} onChange={(e) => save({ ...draft, synopsis: e.target.value })} placeholder="Résumé de l'intrigue…" />
          </label>
          <label className="field">
            <span>Tags</span>
            <TagInput value={draft.tags} onChange={(v) => save({ ...draft, tags: v })} placeholder="Ex. : quête, mystère…" />
          </label>
        </div>

        <div className="panel">
          <h2>Personnages impliqués</h2>
          {!characters || characters.length === 0 ? (
            <p className="muted">
              Aucun personnage. <Link to={`/projects/${projectId}/characters/new`}>Créez-en un</Link>.
            </p>
          ) : (
            <div className="check-list">
              {characters.map((c) => (
                <label key={c.id}>
                  <input
                    type="checkbox"
                    checked={draft.characterIds.includes(c.id)}
                    onChange={() => toggleCharacter(c.id)}
                  />
                  <span>{characterDisplayName(c)}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
