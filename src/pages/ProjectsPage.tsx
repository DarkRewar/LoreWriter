import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../db'
import type { Project } from '../types'
import {
  createProject,
  deleteProject,
  downloadFile,
  duplicateProject,
  exportProjectLore,
  importProjectLore,
} from '../lib/queries'
import { LORE_EXTENSION, LORE_MIME, looksLikeLoreFile } from '../lib/lore'
import { saveFileNative } from '../lib/desktop'
import { downloadRemoteProject, listRemoteProjects, loadCloudConfig, type RemoteProjectInfo } from '../lib/cloud'
import { useConfirm } from '../components/ConfirmDialog'
import { useI18n } from '../i18n'

function ProjectCard({ project }: { project: Project }) {
  const confirm = useConfirm()
  const navigate = useNavigate()
  const { t, dateLocale } = useI18n()
  const counts = useLiveQuery(async () => {
    const pid = project.id
    const [characters, relationships, dialogueScenes, chapters, plots] = await Promise.all([
      db.characters.where('projectId').equals(pid).count(),
      db.relationships.where('projectId').equals(pid).count(),
      db.dialogueScenes.where('projectId').equals(pid).count(),
      db.chapters.where('projectId').equals(pid).count(),
      db.plots.where('projectId').equals(pid).count(),
    ])
    return { characters, relationships, dialogueScenes, chapters, plots }
  }, [project.id])

  const onExport = async () => {
    const bytes = await exportProjectLore(project.id)
    const filename = `${project.name.replace(/[^\w-]+/g, '_')}${LORE_EXTENSION}`
    try {
      const res = await saveFileNative(filename, bytes, t('projects.exportFilter'), ['lore'])
      if (res !== 'unsupported') return
    } catch {
      // retombe sur le téléchargement navigateur
    }
    downloadFile(filename, bytes, LORE_MIME)
  }

  const onDuplicate = async () => {
    const id = await duplicateProject(project.id)
    navigate(`/projects/${id}`)
  }

  const onDelete = async () => {
    if (await confirm({ title: t('projects.deleteTitle'), message: t('projects.deleteMessage', { name: project.name }) })) {
      await deleteProject(project.id)
    }
  }

  return (
    <div className="project-card">
      <h3>
        <Link to={`/projects/${project.id}`}>{project.name}</Link>
      </h3>
      {project.description && <p className="muted">{project.description}</p>}
      <div className="counts">
        {counts
          ? t('projects.counts', {
              characters: counts.characters,
              relationships: counts.relationships,
              dialogues: counts.dialogueScenes,
              chapters: counts.chapters,
              plots: counts.plots,
            })
          : '…'}
        <br />
        {t('projects.modified', { date: new Date(project.updatedAt).toLocaleString(dateLocale) })}
      </div>
      <div className="card-actions">
        <Link className="btn btn-primary" to={`/projects/${project.id}`}>
          {t('projects.open')}
        </Link>
        <button type="button" className="btn" onClick={onDuplicate}>
          {t('projects.duplicate')}
        </button>
        <button type="button" className="btn" onClick={onExport}>
          {t('projects.export')}
        </button>
        <button type="button" className="btn btn-danger" onClick={onDelete}>
          {t('projects.delete')}
        </button>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const projects = useLiveQuery(() => db.projects.orderBy('updatedAt').reverse().toArray(), [])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [remote, setRemote] = useState<RemoteProjectInfo[] | null>(null)
  const [remoteError, setRemoteError] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)
  const navigate = useNavigate()
  const { t, dateLocale } = useI18n()

  const localIds = useMemo(() => new Set((projects ?? []).map((p) => p.id)), [projects])
  const cloudOn = useMemo(() => loadCloudConfig()?.enabled === true, [])
  const remoteOnly = useMemo(() => (remote ?? []).filter((r) => !localIds.has(r.id)), [remote, localIds])

  useEffect(() => {
    const cfg = loadCloudConfig()
    if (!cfg?.enabled) return
    let cancelled = false
    listRemoteProjects(cfg)
      .then((r) => {
        if (!cancelled) setRemote(r)
      })
      .catch((err) => {
        if (!cancelled) setRemoteError(err instanceof Error ? err.message : t('projects.remoteListError'))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const onDownloadRemote = async (id: string) => {
    setDownloading(id)
    setRemoteError('')
    try {
      const pid = await downloadRemoteProject(id)
      navigate(`/projects/${pid}`)
    } catch (err) {
      setRemoteError(err instanceof Error ? err.message : t('projects.remoteDownloadError'))
      setDownloading(null)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(t('projects.nameRequired'))
      return
    }
    const id = await createProject(name.trim(), description.trim())
    navigate(`/projects/${id}`)
  }

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      if (!looksLikeLoreFile(file.name, buf)) throw new Error(t('projects.importBadFile'))
      const id = await importProjectLore(buf)
      navigate(`/projects/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('projects.importError'))
    }
    e.target.value = ''
  }

  return (
    <div className="page">
      <h1>{t('projects.title')}</h1>
      <div className="panel">
        <h2>{t('projects.newProject')}</h2>
        <form onSubmit={submit}>
          <label className="field">
            <span>{t('projects.nameLabel')}</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('projects.namePlaceholder')} autoFocus />
          </label>
          <label className="field">
            <span>{t('projects.descLabel')}</span>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('projects.descPlaceholder')} />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="btn-row">
            <button type="submit" className="btn btn-primary">
              {t('projects.create')}
            </button>
            <label className="btn">
              {t('projects.import')}
              <input type="file" accept=".lore,application/zip" hidden onChange={onImport} />
            </label>
          </div>
        </form>
      </div>

      {projects && projects.length > 0 ? (
        <div className="projects-grid">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        !remoteOnly.length && <p className="muted">{t('projects.empty')}</p>
      )}

      {cloudOn && (
        <div className="panel" style={{ marginTop: 24 }}>
          <h2>{t('projects.cloudSection')}</h2>
          {remoteError && <p className="form-error">{remoteError}</p>}
          {remote === null && !remoteError ? (
            <p className="muted">{t('projects.remoteSearching')}</p>
          ) : remoteOnly.length === 0 ? (
            <p className="muted">
              {remote && remote.length > 0
                ? t('projects.remoteAllHere')
                : t('projects.remoteNone')}
              {remote && remote.length === 0 && <Link to="/cloud">{t('app.cloud')}</Link>}
            </p>
          ) : (
            <>
              <p className="muted">{t('projects.remoteHint')}</p>
              <div className="projects-grid">
                {remoteOnly.map((r) => (
                  <div className="project-card" key={r.id}>
                    <h3>☁️ {r.name}</h3>
                    <div className="counts">{t('projects.modified', { date: new Date(r.updatedAt).toLocaleString(dateLocale) })}</div>
                    <div className="card-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={downloading !== null}
                        onClick={() => void onDownloadRemote(r.id)}
                      >
                        {downloading === r.id ? t('projects.downloading') : t('projects.download')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
