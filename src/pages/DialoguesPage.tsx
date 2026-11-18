import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../db'
import { useProjectId } from '../hooks'
import { newId } from '../lib/ids'
import { addTombstone } from '../lib/tombstones'

export default function DialoguesPage() {
  const projectId = useProjectId()
  const navigate = useNavigate()
  const scenes = useLiveQuery(
    () => db.dialogueScenes.where('projectId').equals(projectId).toArray(),
    [projectId],
  )
  const plots = useLiveQuery(
    () => db.plots.where('projectId').equals(projectId).toArray(),
    [projectId],
  )
  const [title, setTitle] = useState('')

  const create = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const now = Date.now()
    const id = newId()
    await db.dialogueScenes.add({
      id,
      projectId,
      title: title.trim(),
      description: '',
      plotId: '',
      lines: [],
      createdAt: now,
      updatedAt: now,
    })
    await db.projects.update(projectId, { updatedAt: now })
    navigate(`/projects/${projectId}/dialogues/${id}`)
  }

  const remove = async (id: string, name: string) => {
    if (window.confirm(`Supprimer la scène « ${name} » ?`)) {
      await addTombstone(projectId, 'dialogue', id)
      await db.dialogueScenes.delete(id)
      await db.projects.update(projectId, { updatedAt: Date.now() })
    }
  }

  const plotTitle = (plotId: string): string | null => {
    if (!plotId) return null
    const p = plots?.find((x) => x.id === plotId)
    return p ? p.title || 'Sans titre' : null
  }

  return (
    <div className="page">
      <div className="toolbar">
        <h1 style={{ margin: 0 }}>Dialogues</h1>
      </div>

      <div className="panel">
        <h2>Nouvelle scène de dialogue</h2>
        <form onSubmit={create} className="btn-row">
          <input
            type="text"
            placeholder="Titre de la scène (ex. : L'embuscade)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ flex: 1, minWidth: 240 }}
          />
          <button type="submit" className="btn btn-primary">
            Créer
          </button>
        </form>
      </div>

      {!scenes || scenes.length === 0 ? (
        <p className="muted">Aucune scène de dialogue pour l'instant.</p>
      ) : (
        <div className="character-list">
          {scenes
            .slice()
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((s) => (
              <div key={s.id} className="character-row">
                <span className="who">
                  <Link className="name" to={`/projects/${projectId}/dialogues/${s.id}`}>
                    💬 {s.title || 'Sans titre'}
                  </Link>
                  <br />
                  <span className="sub">
                    {s.lines.length} réplique(s)
                    {plotTitle(s.plotId) ? ` · 🧩 ${plotTitle(s.plotId)}` : ''} · modifiée le{' '}
                    {new Date(s.updatedAt).toLocaleString('fr-FR')}
                  </span>
                </span>
                <button type="button" className="btn-icon" aria-label="Supprimer la scène" onClick={() => void remove(s.id, s.title)}>
                  🗑
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
