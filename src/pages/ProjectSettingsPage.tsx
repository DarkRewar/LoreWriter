import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../db'
import { useProject, useProjectId } from '../hooks'
import { deleteProject, downloadJson, exportProjectFiles, exportProjectJson, importProjectFiles, importProjectJson } from '../lib/queries'

type ShowDirectoryPicker = (options?: { id?: string; mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>

const getDirectoryPicker = (): ShowDirectoryPicker | null =>
  (window as unknown as { showDirectoryPicker?: ShowDirectoryPicker }).showDirectoryPicker ?? null

interface DirectoryReader {
  values(): AsyncIterableIterator<FileSystemHandle>
}

const readDirEntries = (handle: FileSystemDirectoryHandle): AsyncIterableIterator<FileSystemHandle> =>
  (handle as unknown as DirectoryReader).values()

export default function ProjectSettingsPage() {
  const projectId = useProjectId()
  const project = useProject()
  const navigate = useNavigate()
  const [name, setName] = useState<string | null>(null)
  const [description, setDescription] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const stats = useLiveQuery(async () => {
    const pid = projectId
    const [characters, relationships, dialogueScenes, chapters, plots] = await Promise.all([
      db.characters.where('projectId').equals(pid).count(),
      db.relationships.where('projectId').equals(pid).count(),
      db.dialogueScenes.where('projectId').equals(pid).count(),
      db.chapters.where('projectId').equals(pid).count(),
      db.plots.where('projectId').equals(pid).count(),
    ])
    return { characters, relationships, dialogueScenes, chapters, plots }
  }, [projectId])

  if (!project) return null

  const onRename = async (e: FormEvent) => {
    e.preventDefault()
    if (!name?.trim()) return
    await db.projects.update(projectId, { name: name.trim(), description: description ?? '', updatedAt: Date.now() })
    setMessage('Projet renommé.')
    setName(null)
  }

  const onExport = async () => {
    const json = await exportProjectJson(projectId)
    downloadJson(`${project.name.replace(/[^\w-]+/g, '_')}.lorewriter.json`, json)
  }

  const onExportFiles = async () => {
    const picker = getDirectoryPicker()
    if (!picker) {
      setMessage("L'export en dossier n'est pas supporté par ce navigateur — utilisez l'export .json.")
      return
    }
    try {
      const dir = await picker({ id: 'lorewriter-export', mode: 'readwrite' })
      const files = await exportProjectFiles(projectId)
      for (const [path, content] of files) {
        const parts = path.split('/')
        let handle = dir
        for (const part of parts.slice(0, -1)) handle = await handle.getDirectoryHandle(part, { create: true })
        const file = await handle.getFileHandle(parts[parts.length - 1], { create: true })
        const w = await file.createWritable()
        await w.write(content)
        await w.close()
      }
      setMessage('Projet exporté en plusieurs fichiers : project.json + chapters/*.md + dialogues/*.json.')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setMessage(err instanceof Error ? err.message : "Export impossible.")
    }
  }

  const onImportFiles = async () => {
    const picker = getDirectoryPicker()
    if (!picker) {
      setMessage("L'import d'un dossier n'est pas supporté par ce navigateur — importez le fichier .json.")
      return
    }
    try {
      const dir = await picker({ id: 'lorewriter-import', mode: 'read' })
      const files = new Map<string, string>()
      const walk = async (handle: FileSystemDirectoryHandle, prefix: string): Promise<void> => {
        for await (const entry of readDirEntries(handle)) {
          if (entry.kind === 'directory') await walk(entry as FileSystemDirectoryHandle, `${prefix}${entry.name}/`)
          else files.set(`${prefix}${entry.name}`, await (await (entry as FileSystemFileHandle).getFile()).text())
        }
      }
      await walk(dir, '')
      const id = await importProjectFiles(files)
      setMessage('Projet importé depuis le dossier de fichiers.')
      navigate(`/projects/${id}`)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setMessage(err instanceof Error ? err.message : "Import impossible.")
    }
  }

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const id = await importProjectJson(await file.text())
      setMessage('Projet importé avec succès.')
      navigate(`/projects/${id}`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import impossible.')
    }
    e.target.value = ''
  }

  const onDelete = async () => {
    if (window.confirm(`Supprimer définitivement « ${project.name} » et tout son contenu ? Cette action est irréversible.`)) {
      await deleteProject(projectId)
      navigate('/')
    }
  }

  return (
    <div className="page">
      <h1>Paramètres du projet</h1>

      <div className="panel">
        <h2>Informations</h2>
        <form onSubmit={onRename} style={{ maxWidth: 560 }}>
          <label className="field">
            <span>Nom du projet</span>
            <input
              type="text"
              value={name ?? project.name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Description</span>
            <input
              type="text"
              value={description ?? project.description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Enregistrer
          </button>
          {message && <p className="muted">{message}</p>}
        </form>
        {stats && (
          <p className="muted">
            Contenu : {stats.characters} personnage(s), {stats.relationships} relation(s), {stats.dialogueScenes} scène(s)
            de dialogue, {stats.chapters} chapitre(s), {stats.plots} intrigue(s).
          </p>
        )}
      </div>

      <div className="panel">
        <h2>Exporter / importer</h2>
        <p className="muted">
          Deux formats au choix : un fichier JSON complet, ou un dossier de plusieurs fichiers —{' '}
          <code>project.json</code> (projet, personnages, relations, intrigues), un fichier{' '}
          <code>.md</code> dédié par chapitre et un fichier <code>.json</code> par scène de dialogue. C'est le même
          découpage que la synchronisation cloud.
        </p>
        <div className="btn-row">
          <button type="button" className="btn" onClick={onExport}>
            ⬇️ Exporter le projet (.json)
          </button>
          <button type="button" className="btn" onClick={onExportFiles}>
            🗂️ Exporter en dossier (plusieurs fichiers)
          </button>
          <label className="btn">
            ⬆️ Importer un projet (.json)
            <input type="file" accept="application/json,.json" hidden onChange={onImport} />
          </label>
          <button type="button" className="btn" onClick={onImportFiles}>
            📂 Importer un dossier exporté
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>Synchronisation cloud</h2>
        <p className="muted">
          La synchro automatique se configure globalement dans la page{' '}
          <Link to="/cloud">☁️ Cloud</Link> (serveur WebDAV compatible Nextcloud/ownCloud). Chaque projet est alors
          envoyé automatiquement vers votre cloud en plusieurs fichiers (<code>project.json</code>,{' '}
          <code>chapters/*.md</code>, <code>dialogues/*.json</code>) et fusionné au démarrage.
        </p>
      </div>

      <div className="danger-zone">
        <h2>Zone dangereuse</h2>
        <p className="muted">Supprime le projet et tout son contenu, localement.</p>
        <button type="button" className="btn btn-danger" onClick={onDelete}>
          Supprimer définitivement le projet
        </button>
      </div>
    </div>
  )
}
