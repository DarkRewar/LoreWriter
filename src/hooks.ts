import { useLiveQuery } from 'dexie-react-hooks'
import { useParams } from 'react-router-dom'
import { db } from './db'
import type { Project } from './types'

export function useProjectId(): string {
  const { projectId } = useParams()
  return projectId ?? ''
}

export function useProject(): Project | undefined {
  const projectId = useProjectId()
  return useLiveQuery(() => (projectId ? db.projects.get(projectId) : undefined), [projectId])
}
