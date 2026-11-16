import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../db'
import { useProject, useProjectId } from '../hooks'
import { deleteProject, downloadFile, downloadJson, exportProjectLore, exportProjectJson, importProjectJson, importProjectLore } from '../lib/queries'
import { LORE_EXTENSION, LORE_MIME, looksLikeLoreFile } from '../lib/lore'

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

  const onExportLore = async () => {
    const bytes = await exportProjectLore(projectId)
    downloadFile(`${project.name.replace(/[^\w-]+/g, '_')}${LORE_EXTENSION}`, bytes, LORE_MIME)
  }

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      const id = looksLikeLoreFile(file.name, buf)
        ? await importProjectLore(buf)
        : await importProjectJson(new TextDecoder().decode(buf))
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
          L'export se fait en <strong>un seul fichier <code>.lore</code></strong> : une archive ZIP qui contient la
          sauvegarde du projet découpée en plusieurs fichiers — <code>project.json</code> (fichier de base : projet,
          personnages, relations, intrigues), un fichier <code>.md</code> dédié par chapitre et un fichier{' '}
          <code>.json</code> par scène de dialogue. C'est le même découpage que la synchronisation cloud, empaqueté
          dans un seul fichier ouvrable avec n'importe quel outil ZIP. Un export <code>.json</code> plat reste
          disponible.
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={onExportLore}>
            📦 Exporter le projet (.lore)
          </button>
          <button type="button" className="btn" onClick={onExport}>
            ⬇️ Exporter le projet (.json)
          </button>
          <label className="btn">
            ⬆️ Importer un projet (.lore ou .json)
            <input type="file" accept=".lore,.json,application/json,application/zip" hidden onChange={onImport} />
          </label>
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
