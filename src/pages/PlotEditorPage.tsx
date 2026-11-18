import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../db'
import { useProjectId } from '../hooks'
import { newId } from '../lib/ids'
import type { DialogueScene, Plot, PlotStatus } from '../types'
import { characterDisplayName } from '../types'
import { TagInput } from '../components/TagInput'
import { useConfirm } from '../components/ConfirmDialog'
import { addTombstone } from '../lib/tombstones'
import { useI18n, type MessageKey } from '../i18n'

const STATUS_KEYS: Record<PlotStatus, MessageKey> = {
  idea: 'plots.status.idea',
  draft: 'plots.status.draft',
  wip: 'plots.status.wip',
  done: 'plots.status.done',
}

export default function PlotEditorPage() {
  const confirm = useConfirm()
  const { t } = useI18n()
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
  const linkedScenes = useLiveQuery(
    () => (plotId ? db.dialogueScenes.where('plotId').equals(plotId).toArray() : Promise.resolve<DialogueScene[]>([])),
    [plotId],
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
        <p>{t('plots.editor.plotNotFound')}</p>
        <Link to={`/projects/${projectId}/plots`}>{t('plots.editor.backToPlots')}</Link>
      </div>
    )
  }
  if (!draft) return <div className="page">{t('common.loading')}</div>

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
    if (await confirm({ message: t('plots.deleteConfirm', { title: draft.title || t('plots.untitled') }) })) {
      await addTombstone(projectId, 'plot', draft.id)
      await db.plots.delete(draft.id)
      navigate(`/projects/${projectId}/plots`)
    }
  }

  return (
    <div className="page">
      <div className="toolbar">
        <Link to={`/projects/${projectId}/plots`}>{t('plots.editor.back')}</Link>
        {isEdit && (
          <button type="button" className="btn btn-danger" style={{ marginLeft: 'auto' }} onClick={onDelete}>
            {t('plots.editor.delete')}
          </button>
        )}
      </div>

      <h1>{isEdit ? t('plots.editor.editTitle') : t('plots.editor.newTitle')}</h1>
      <div style={{ maxWidth: 760 }}>
        <div className="panel">
          <label className="field">
            <span>{t('plots.editor.titleLabel')}</span>
            <input type="text" value={draft.title} onChange={(e) => save({ ...draft, title: e.target.value })} placeholder={t('plots.editor.titlePlaceholder')} />
          </label>
          <label className="field">
            <span>{t('plots.editor.statusLabel')}</span>
            <select value={draft.status} onChange={(e) => save({ ...draft, status: e.target.value as PlotStatus })}>
              {(Object.keys(STATUS_KEYS) as PlotStatus[]).map((s) => (
                <option key={s} value={s}>
                  {t(STATUS_KEYS[s])}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('plots.editor.synopsisLabel')}</span>
            <textarea value={draft.synopsis} onChange={(e) => save({ ...draft, synopsis: e.target.value })} placeholder={t('plots.editor.synopsisPlaceholder')} />
          </label>
          <label className="field">
            <span>{t('plots.editor.tagsLabel')}</span>
            <TagInput value={draft.tags} onChange={(v) => save({ ...draft, tags: v })} placeholder={t('plots.editor.tagsPlaceholder')} />
          </label>
        </div>

        <div className="panel">
          <h2>{t('plots.editor.charactersLabel')}</h2>
          {!characters || characters.length === 0 ? (
            <p className="muted">
              {t('plots.editor.noCharacters')} <Link to={`/projects/${projectId}/characters/new`}>{t('plots.editor.createOne')}</Link>.
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

        <div className="panel">
          <h2>{t('plots.editor.linkedScenes', { n: linkedScenes?.length ?? 0 })}</h2>
          {!linkedScenes || linkedScenes.length === 0 ? (
            <p className="muted">
              {t('plots.editor.noScenes')}
            </p>
          ) : (
            <div className="character-list">
              {linkedScenes
                .slice()
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((s) => (
                  <div key={s.id} className="character-row">
                    <span className="who">
                      <Link className="name" to={`/projects/${projectId}/dialogues/${s.id}`}>
                        💬 {s.title || t('plots.untitled')}
                      </Link>
                      <br />
                      <span className="sub">{t('dialogues.lines', { n: s.lines.length })}</span>
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
