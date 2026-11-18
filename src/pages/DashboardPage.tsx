import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../db'
import { useProject, useProjectId } from '../hooks'
import { CharacterAvatar } from '../components/CharacterAvatar'
import { characterDisplayName } from '../types'
import { useI18n } from '../i18n'

export default function DashboardPage() {
  const { t } = useI18n()
  const projectId = useProjectId()
  const project = useProject()
  const stats = useLiveQuery(async () => {
    const pid = projectId
    const [characters, relationships, dialogueScenes, novels, chapters, plots, wiki] = await Promise.all([
      db.characters.where('projectId').equals(pid).count(),
      db.relationships.where('projectId').equals(pid).count(),
      db.dialogueScenes.where('projectId').equals(pid).count(),
      db.novels.where('projectId').equals(pid).count(),
      db.chapters.where('projectId').equals(pid).count(),
      db.plots.where('projectId').equals(pid).count(),
      db.wikiEntries.where('projectId').equals(pid).count(),
    ])
    const recent = await db.characters.where('projectId').equals(pid).sortBy('updatedAt')
    return { characters, relationships, dialogueScenes, novels, chapters, plots, wiki, recent: recent.reverse().slice(0, 5) }
  }, [projectId])

  if (!project) return null
  const base = `/projects/${projectId}`

  return (
    <div className="page">
      <h1>{project.name}</h1>
      {project.description && <p className="muted">{project.description}</p>}

      <div className="projects-grid">
        <Link className="project-card" to={`${base}/characters`}>
          <h3>{t('dashboard.characters')}</h3>
          <div className="counts">{stats?.characters ?? '…'}</div>
        </Link>
        <Link className="project-card" to={`${base}/relations`}>
          <h3>{t('dashboard.relations')}</h3>
          <div className="counts">{stats?.relationships ?? '…'}</div>
        </Link>
        <Link className="project-card" to={`${base}/wiki`}>
          <h3>{t('dashboard.wiki')}</h3>
          <div className="counts">{t('dashboard.wikiCount', { n: stats?.wiki ?? '…' })}</div>
        </Link>
        <Link className="project-card" to={`${base}/plots`}>
          <h3>{t('dashboard.plots')}</h3>
          <div className="counts">{stats?.plots ?? '…'}</div>
        </Link>
        <Link className="project-card" to={`${base}/dialogues`}>
          <h3>{t('dashboard.dialogues')}</h3>
          <div className="counts">{t('dashboard.scenes', { n: stats?.dialogueScenes ?? '…' })}</div>
        </Link>
        <Link className="project-card" to={`${base}/novel`}>
          <h3>{t('dashboard.novels')}</h3>
          <div className="counts">{t('dashboard.novelsCount', { novels: stats?.novels ?? '…', chapters: stats?.chapters ?? '…' })}</div>
        </Link>
        <Link className="project-card" to={`${base}/search`}>
          <h3>{t('dashboard.search')}</h3>
          <div className="counts">{t('dashboard.searchHint')}</div>
        </Link>
      </div>

      {stats && stats.recent.length > 0 && (
        <div className="panel" style={{ marginTop: 24 }}>
          <h2>{t('dashboard.recent')}</h2>
          <div className="character-list">
            {stats.recent.map((c) => (
              <Link key={c.id} className="character-row" to={`${base}/characters/${c.id}`}>
                <CharacterAvatar character={c} size={40} />
                <span className="who">
                  <span className="name">{characterDisplayName(c)}</span>
                  {c.role && <span className="sub"> · {c.role}</span>}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
