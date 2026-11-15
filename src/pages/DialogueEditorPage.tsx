import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import { db } from '../db'
import { useProjectId } from '../hooks'
import { newId } from '../lib/ids'
import type { DialogueLine, DialogueScene } from '../types'
import { characterDisplayName } from '../types'

export default function DialogueEditorPage() {
  const projectId = useProjectId()
  const { sceneId } = useParams()
  const [preview, setPreview] = useState(false)

  const scene = useLiveQuery(() => (sceneId ? db.dialogueScenes.get(sceneId) : undefined), [sceneId])
  const characters = useLiveQuery(
    () =>
      db.characters
        .where('projectId')
        .equals(projectId)
        .toArray()
        .then((list) => list.sort((a, b) => characterDisplayName(a).localeCompare(characterDisplayName(b), 'fr'))),
    [projectId],
  )

  const [draft, setDraft] = useState<DialogueScene | null>(null)
  useEffect(() => {
    if (scene) setDraft({ ...scene, lines: scene.lines.map((l) => ({ ...l })) })
  }, [scene])

  const save = useMemo(
    () => {
      let timer: ReturnType<typeof setTimeout> | undefined
      return (next: DialogueScene) => {
        setDraft(next)
        clearTimeout(timer)
        timer = setTimeout(async () => {
          await db.dialogueScenes.put({ ...next, updatedAt: Date.now() })
          await db.projects.update(projectId, { updatedAt: Date.now() })
        }, 300)
      }
    },
    [projectId],
  )

  if (!scene || !draft) {
    return (
      <div className="page">
        <p>Scène introuvable.</p>
        <Link to={`/projects/${projectId}/dialogues`}>← Retour aux dialogues</Link>
      </div>
    )
  }

  const update = (patch: Partial<DialogueScene>) => save({ ...draft, ...patch })

  const updateLine = (id: string, patch: Partial<DialogueLine>) =>
    update({ lines: draft.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) })

  const addLine = () =>
    update({ lines: [...draft.lines, { id: newId(), characterId: characters?.[0]?.id ?? '', text: '' }] })

  const removeLine = (id: string) => update({ lines: draft.lines.filter((l) => l.id !== id) })

  const moveLine = (id: string, dir: -1 | 1) => {
    const idx = draft.lines.findIndex((l) => l.id === id)
    const j = idx + dir
    if (idx < 0 || j < 0 || j >= draft.lines.length) return
    const lines = draft.lines.slice()
    ;[lines[idx], lines[j]] = [lines[j], lines[idx]]
    update({ lines })
  }

  const who = (id: string) => {
    if (!id) return 'Narrateur'
    const c = characters?.find((x) => x.id === id)
    return c ? characterDisplayName(c) : 'Narrateur'
  }

  return (
    <div className="page">
      <div className="toolbar">
        <Link to={`/projects/${projectId}/dialogues`}>← Dialogues</Link>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Titre de la scène"
          style={{ flex: 1, minWidth: 200, fontWeight: 600 }}
        />
        <div className="view-toggle">
          <button type="button" className={!preview ? 'active' : ''} onClick={() => setPreview(false)}>
            ✏️ Édition
          </button>
          <button type="button" className={preview ? 'active' : ''} onClick={() => setPreview(true)}>
            👁️ Aperçu
          </button>
        </div>
      </div>

      <div className="panel">
        <label className="field">
          <span>Description de la scène (optionnel)</span>
          <input
            type="text"
            value={draft.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Où se passe la scène, dans quelles circonstances…"
          />
        </label>
      </div>

      {preview ? (
        <div key="preview" className="dialogue-preview view-anim">
          {draft.lines.length === 0 && <p className="muted">Aucune réplique pour l'instant.</p>}
          {draft.lines.map((l) => (
            <div key={l.id} className={`line${l.characterId ? '' : ' narrator'}`}>
              <span className="speaker">{who(l.characterId)} :</span>{' '}
              <span>{l.text}</span>
            </div>
          ))}
        </div>
      ) : (
        <div key="editor" className="panel view-anim">
          <h2>Répliques ({draft.lines.length})</h2>
          {draft.lines.map((l) => (
            <div className="line-row" key={l.id}>
              <select value={l.characterId} onChange={(e) => updateLine(l.id, { characterId: e.target.value })}>
                <option value="">Narrateur</option>
                {(characters ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {characterDisplayName(c)}
                  </option>
                ))}
              </select>
              <textarea
                value={l.text}
                rows={Math.max(1, l.text.split('\n').length)}
                placeholder="Réplique…"
                onChange={(e) => updateLine(l.id, { text: e.target.value })}
              />
              <div className="line-actions">
                <button type="button" className="btn-icon" title="Monter" onClick={() => moveLine(l.id, -1)}>
                  ↑
                </button>
                <button type="button" className="btn-icon" title="Descendre" onClick={() => moveLine(l.id, 1)}>
                  ↓
                </button>
                <button type="button" className="btn-icon" title="Supprimer" onClick={() => removeLine(l.id)}>
                  🗑
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-primary" onClick={addLine}>
            + Ajouter une réplique
          </button>
        </div>
      )}
    </div>
  )
}
