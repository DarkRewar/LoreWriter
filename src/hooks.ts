import { useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useParams } from 'react-router-dom'
import { db } from './db'
import { SAVE_EVENT } from './lib/save'
import type { Project } from './types'

export function useProjectId(): string {
  const { projectId } = useParams()
  return projectId ?? ''
}

export function useProject(): Project | undefined {
  const projectId = useProjectId()
  return useLiveQuery(() => (projectId ? db.projects.get(projectId) : undefined), [projectId])
}

/** Exécute `flush` à chaque demande de sauvegarde globale (bouton 💾 / Ctrl+S). */
export function useSaveFlush(flush: () => void): void {
  const ref = useRef(flush)
  ref.current = flush
  useEffect(() => {
    const handler = () => ref.current()
    window.addEventListener(SAVE_EVENT, handler)
    return () => window.removeEventListener(SAVE_EVENT, handler)
  }, [])
}
