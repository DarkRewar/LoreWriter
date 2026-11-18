import { useCallback, useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useParams } from 'react-router-dom'
import { db } from './db'
import { SAVE_EVENT } from './lib/save'
import { collectMentionItems, type MentionRef } from './lib/mentions'
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

/** Liste des entités référençables (@mentions) du projet courant, sous forme de getter stable. */
export function useMentionItems(): () => MentionRef[] {
  const projectId = useProjectId()
  const items = useLiveQuery(async () => {
    const pid = projectId
    if (!pid) return []
    const [characters, wikiEntries, dialogueScenes, novels, plots] = await Promise.all([
      db.characters.where('projectId').equals(pid).toArray(),
      db.wikiEntries.where('projectId').equals(pid).toArray(),
      db.dialogueScenes.where('projectId').equals(pid).toArray(),
      db.novels.where('projectId').equals(pid).toArray(),
      db.plots.where('projectId').equals(pid).toArray(),
    ])
    return collectMentionItems({ characters, wikiEntries, dialogueScenes, novels, plots })
  }, [projectId])
  // getter à identité STABLE (ref) : évite de recréer l'éditeur TipTap (perte de focus) à chaque mise à jour
  const itemsRef = useRef<MentionRef[]>([])
  itemsRef.current = items ?? []
  return useCallback(() => itemsRef.current, [])
}
