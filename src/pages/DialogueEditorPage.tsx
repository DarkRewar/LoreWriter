import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import { db } from '../db'
import { RichTextEditor } from '../components/RichTextEditor'
import { useMentionItems, useProjectId, useSaveFlush } from '../hooks'
import { newId } from '../lib/ids'
import type { DialogueLine, DialogueScene } from '../types'
import { characterDisplayName } from '../types'
import { useConfirm } from '../components/ConfirmDialog'
import { useI18n } from '../i18n'

export default function DialogueEditorPage() {
  const confirm = useConfirm()
  const { t, dateLocale } = useI18n()
  const projectId = useProjectId()
  const mentionItems = useMentionItems()
  const { sceneId } = useParams()
  const [preview, setPreview] = useState(false)

  const scene = useLiveQuery(() => (sceneId ? db.dialogueScenes.get(sceneId) : undefined), [sceneId])
  const characters = useLiveQuery(
    () =>
      db.characters
        .where('projectId')
        .equals(projectId)
        .toArray()
        .then((list) => list.sort((a, b) => characterDisplayName(a).localeCompare(characterDisplayName(b), dateLocale))),
    [projectId],
  )
  const plots = useLiveQuery(
    () =>
      db.plots
        .where('projectId')
        .equals(projectId)
        .toArray()
        .then((list) => list.sort((a, b) => a.title.localeCompare(b.title, dateLocale))),
    [projectId],
  )

  const [draft, setDraft] = useState<DialogueScene | null>(null)
  useEffect(() => {
    if (scene) setDraft({ ...scene, lines: scene.lines.map((l) => ({ ...l })) })
  }, [scene])

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingRef = useRef<DialogueScene | null>(null)
  const writeScene = useCallback(
    async (s: DialogueScene) => {
      await db.dialogueScenes.put({ ...s, updatedAt: Date.now() })
      await db.projects.update(projectId, { updatedAt: Date.now() })
    },
    [projectId],
  )
  const flush = useCallback(() => {
    clearTimeout(timerRef.current)
    const p = pendingRef.current
    if (p) {
      pendingRef.current = null
      void writeScene(p)
    }
  }, [writeScene])
  useSaveFlush(flush)

  const save = useCallback(
    (next: DialogueScene) => {
      setDraft(next)
      pendingRef.current = next
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const p = pendingRef.current
        if (p) {
          pendingRef.current = null
          void writeScene(p)
        }
      }, 300)
    },
    [writeScene],
  )

  if (!scene || !draft) {
    return (
      <div className="page">
        <p>{t('dialogues.editor.sceneNotFound')}</p>
        <Link to={`/projects/${projectId}/dialogues`}>{t('dialogues.editor.backToDialogues')}</Link>
      </div>
    )
  }

  const update = (patch: Partial<DialogueScene>) => save({ ...draft, ...patch })

  const updateLine = (id: string, patch: Partial<DialogueLine>) =>
    update({ lines: draft.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) })

  const addLine = () =>
    update({ lines: [...draft.lines, { id: newId(), characterId: characters?.[0]?.id ?? '', text: '' }] })

  const removeLine = async (id: string) => {
    if (!(await confirm({ message: t('dialogues.editor.deleteLineConfirm') }))) return
    update({ lines: draft.lines.filter((l) => l.id !== id) })
  }

  const moveLine = (id: string, dir: -1 | 1) => {
    const idx = draft.lines.findIndex((l) => l.id === id)
    const j = idx + dir
    if (idx < 0 || j < 0 || j >= draft.lines.length) return
    const lines = draft.lines.slice()
    ;[lines[idx], lines[j]] = [lines[j], lines[idx]]
    update({ lines })
  }

  const who = (id: string) => {
    if (!id) return t('dialogues.editor.narrator')
    const c = characters?.find((x) => x.id === id)
    return c ? characterDisplayName(c) : t('dialogues.editor.narrator')
  }

  return (
    <div className="page">
      <div className="toolbar">
        <Link to={`/projects/${projectId}/dialogues`}>{t('dialogues.editor.back')}</Link>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder={t('dialogues.editor.titlePlaceholder')}
          style={{ flex: 1, minWidth: 200, fontWeight: 600 }}
        />
        <div className="view-toggle">
          <button type="button" className={!preview ? 'active' : ''} onClick={() => setPreview(false)}>
            {t('dialogues.editor.edit')}
          </button>
          <button type="button" className={preview ? 'active' : ''} onClick={() => setPreview(true)}>
            {t('dialogues.editor.preview')}
          </button>
        </div>
      </div>

      <div className="panel">
        <label className="field">
          <span>{t('dialogues.editor.descLabel')}</span>
          <input
            type="text"
            value={draft.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder={t('dialogues.editor.descPlaceholder')}
          />
        </label>
        <label className="field">
          <span>{t('dialogues.editor.plotLabel')}</span>
          <select value={draft.plotId ?? ''} onChange={(e) => update({ plotId: e.target.value })}>
            <option value="">{t('dialogues.editor.noPlot')}</option>
            {(plots ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || 'Sans titre'}
              </option>
            ))}
          </select>
        </label>
      </div>

      {preview ? (
        <div key="preview" className="dialogue-preview view-anim">
          {draft.lines.length === 0 && <p className="muted">{t('dialogues.editor.noLines')}</p>}
          {draft.lines.map((l) => (
            <div key={l.id} className={`line${l.characterId ? '' : ' narrator'}`}>
              <span className="speaker">{who(l.characterId)} :</span>{' '}
              <span>
                {l.text.includes('<') ? <span dangerouslySetInnerHTML={{ __html: l.text }} /> : l.text}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div key="editor" className="panel view-anim">
          <h2>{t('dialogues.editor.linesTitle', { n: draft.lines.length })}</h2>
          {draft.lines.map((l) => (
            <div className="line-row" key={l.id}>
              <select value={l.characterId} onChange={(e) => updateLine(l.id, { characterId: e.target.value })}>
                <option value="">{t('dialogues.editor.narrator')}</option>
                {(characters ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {characterDisplayName(c)}
                  </option>
                ))}
              </select>
              <div className="line-editor">
                <RichTextEditor
                  compact
                  mentions={mentionItems}
                  content={l.text}
                  onUpdate={(html) => updateLine(l.id, { text: html })}
                  placeholder={t('dialogues.editor.linePlaceholder')}
                />
              </div>
              <div className="line-actions">
                <button type="button" className="btn-icon" title={t('dialogues.editor.up')} onClick={() => moveLine(l.id, -1)}>
                  ↑
                </button>
                <button type="button" className="btn-icon" title={t('dialogues.editor.down')} onClick={() => moveLine(l.id, 1)}>
                  ↓
                </button>
                <button type="button" className="btn-icon" title={t('dialogues.editor.delete')} onClick={() => void removeLine(l.id)}>
                  🗑
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-primary" onClick={addLine}>
            {t('dialogues.editor.addLine')}
          </button>
        </div>
      )}
    </div>
  )
}
