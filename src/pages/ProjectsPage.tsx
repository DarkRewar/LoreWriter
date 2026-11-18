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

function ProjectCard({ project }: { project: Project }) {
  const confirm = useConfirm()
  const navigate = useNavigate()
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
      const res = await saveFileNative(filename, bytes, 'Projet LoreWriter (.lore)', ['lore'])
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
    if (await confirm({ title: 'Supprimer le projet', message: `Supprimer définitivement le projet « ${project.name} » et tout son contenu ?` })) {
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
          ? `${counts.characters} personnage(s) · ${counts.relationships} relation(s) · ${counts.dialogueScenes} dialogue(s) · ${counts.chapters} chapitre(s) · ${counts.plots} intrigue(s)`
          : '…'}
        <br />
        modifié le {new Date(project.updatedAt).toLocaleString('fr-FR')}
      </div>
      <div className="card-actions">
        <Link className="btn btn-primary" to={`/projects/${project.id}`}>
          Ouvrir
        </Link>
        <button type="button" className="btn" onClick={onDuplicate}>
          Dupliquer
        </button>
        <button type="button" className="btn" onClick={onExport}>
          Exporter (.lore)
        </button>
        <button type="button" className="btn btn-danger" onClick={onDelete}>
          Supprimer
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
        if (!cancelled) setRemoteError(err instanceof Error ? err.message : 'Listage distant impossible.')
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
      setRemoteError(err instanceof Error ? err.message : 'Téléchargement impossible.')
      setDownloading(null)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Donne un nom au projet.')
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
      if (!looksLikeLoreFile(file.name, buf)) throw new Error('Sélectionnez un fichier .lore (archive du projet).')
      const id = await importProjectLore(buf)
      navigate(`/projects/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import impossible.')
    }
    e.target.value = ''
  }

  return (
    <div className="page">
      <h1>Mes projets d'histoire</h1>
      <div className="panel">
        <h2>Nouveau projet</h2>
        <form onSubmit={submit}>
          <label className="field">
            <span>Nom du projet</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. : Les Ombres de Valombre" autoFocus />
          </label>
          <label className="field">
            <span>Description (optionnelle)</span>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Genre, synopsis rapide…" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="btn-row">
            <button type="submit" className="btn btn-primary">
              Créer le projet
            </button>
            <label className="btn">
              Importer un projet (.lore)
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
        !remoteOnly.length && <p className="muted">Aucun projet pour l'instant — créez votre premier univers ci-dessus. ✨</p>
      )}

      {cloudOn && (
        <div className="panel" style={{ marginTop: 24 }}>
          <h2>☁️ Projets sur le cloud</h2>
          {remoteError && <p className="form-error">{remoteError}</p>}
          {remote === null && !remoteError ? (
            <p className="muted">Recherche de projets distants…</p>
          ) : remoteOnly.length === 0 ? (
            <p className="muted">
              {remote && remote.length > 0
                ? 'Tous les projets du cloud sont déjà présents ici.'
                : 'Aucun projet distant pour l’instant — configurez la synchro dans '}
              {remote && remote.length === 0 && <Link to="/cloud">☁️ Cloud</Link>}
            </p>
          ) : (
            <>
              <p className="muted">Présents sur votre serveur WebDAV mais pas encore sur cet appareil :</p>
              <div className="projects-grid">
                {remoteOnly.map((r) => (
                  <div className="project-card" key={r.id}>
                    <h3>☁️ {r.name}</h3>
                    <div className="counts">modifié le {new Date(r.updatedAt).toLocaleString('fr-FR')}</div>
                    <div className="card-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={downloading !== null}
                        onClick={() => void onDownloadRemote(r.id)}
                      >
                        {downloading === r.id ? 'Téléchargement…' : '⬇️ Télécharger'}
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
