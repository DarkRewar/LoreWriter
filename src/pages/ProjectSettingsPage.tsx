import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../db'
import { useProject, useProjectId } from '../hooks'
import { deleteProject, downloadFile, exportProjectLore, importProjectLore } from '../lib/queries'
import { LORE_EXTENSION, LORE_MIME, looksLikeLoreFile } from '../lib/lore'
import { saveFileNative } from '../lib/desktop'
import { useConfirm } from '../components/ConfirmDialog'
import { useI18n } from '../i18n'

export default function ProjectSettingsPage() {
  const confirm = useConfirm()
  const { t } = useI18n()
  const projectId = useProjectId()
  const project = useProject()
  const navigate = useNavigate()
  const [name, setName] = useState<string | null>(null)
  const [description, setDescription] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const stats = useLiveQuery(async () => {
    const pid = projectId
    const [characters, relationships, dialogueScenes, novels, chapters, plots] = await Promise.all([
      db.characters.where('projectId').equals(pid).count(),
      db.relationships.where('projectId').equals(pid).count(),
      db.dialogueScenes.where('projectId').equals(pid).count(),
      db.novels.where('projectId').equals(pid).count(),
      db.chapters.where('projectId').equals(pid).count(),
      db.plots.where('projectId').equals(pid).count(),
    ])
    return { characters, relationships, dialogueScenes, novels, chapters, plots }
  }, [projectId])

  if (!project) return null

  const onRename = async (e: FormEvent) => {
    e.preventDefault()
    if (!name?.trim()) return
    await db.projects.update(projectId, { name: name.trim(), description: description ?? '', updatedAt: Date.now() })
    setMessage(t('projectSettings.renamed'))
    setName(null)
  }

  const onExportLore = async () => {
    const bytes = await exportProjectLore(projectId)
    const filename = `${project.name.replace(/[^\w-]+/g, '_')}${LORE_EXTENSION}`
    try {
      const res = await saveFileNative(filename, bytes, t('projectSettings.exportFilter'), ['lore'])
      if (res === 'saved') {
        setMessage(t('projectSettings.exported', { filename }))
        return
      }
      if (res === 'cancelled') return
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('projectSettings.exportError'))
      return
    }
    downloadFile(filename, bytes, LORE_MIME)
  }

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      if (!looksLikeLoreFile(file.name, buf)) throw new Error(t('projectSettings.importBadFile'))
      const id = await importProjectLore(buf)
      setMessage(t('projectSettings.importOk'))
      navigate(`/projects/${id}`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('projectSettings.importError'))
    }
    e.target.value = ''
  }

  const onDelete = async () => {
    if (await confirm({ title: t('projectSettings.deleteTitle'), message: t('projectSettings.deleteMessage', { name: project.name }) })) {
      await deleteProject(projectId)
      navigate('/')
    }
  }

  return (
    <div className="page">
      <h1>{t('projectSettings.title')}</h1>

      <div className="panel">
        <h2>{t('projectSettings.info')}</h2>
        <form onSubmit={onRename} style={{ maxWidth: 560 }}>
          <label className="field">
            <span>{t('projectSettings.nameLabel')}</span>
            <input
              type="text"
              value={name ?? project.name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{t('projectSettings.descLabel')}</span>
            <input
              type="text"
              value={description ?? project.description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary">
            {t('projectSettings.save')}
          </button>
          {message && <p className="muted">{message}</p>}
        </form>
        {stats && (
          <p className="muted">
            {t('projectSettings.stats', {
              characters: stats.characters,
              relationships: stats.relationships,
              dialogues: stats.dialogueScenes,
              novels: stats.novels,
              chapters: stats.chapters,
              plots: stats.plots,
            })}
          </p>
        )}
      </div>

      <div className="panel">
        <h2>{t('projectSettings.exportImport')}</h2>
        <p className="muted">
          {t('projectSettings.exportText')}
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={onExportLore}>
            {t('projectSettings.export')}
          </button>
          <label className="btn">
            {t('projectSettings.import')}
            <input type="file" accept=".lore,application/zip" hidden onChange={onImport} />
          </label>
        </div>
      </div>

      <div className="panel">
        <h2>{t('projectSettings.cloudSection')}</h2>
        <p className="muted">
          {t('projectSettings.cloudText')} <Link to="/cloud">{t('app.cloud')}</Link> {t('projectSettings.cloudText2')}
        </p>
      </div>

      <div className="danger-zone">
        <h2>{t('projectSettings.dangerZone')}</h2>
        <p className="muted">{t('projectSettings.dangerText')}</p>
        <button type="button" className="btn btn-danger" onClick={onDelete}>
          {t('projectSettings.deleteProject')}
        </button>
      </div>
    </div>
  )
}
