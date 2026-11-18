import { useCallback, useEffect, useState } from 'react'
import { useMatch } from 'react-router-dom'
import { db } from '../db'
import { loadCloudConfig, type SyncStatus } from '../lib/cloud'
import { syncProjectWithBackup } from '../lib/backup'
import { requestSaveNow } from '../lib/save'

const ACTION_LABELS: Record<SyncStatus['action'], string> = {
  pushed: 'envoyé vers le cloud',
  'pulled-merged': 'fusionné avec le cloud',
  'up-to-date': 'déjà à jour sur le cloud',
  'nothing-remote': 'premier envoi vers le cloud',
}

export default function SaveButton() {
  const match = useMatch('/projects/:projectId/*')
  const projectId = match?.params.projectId ?? ''
  const [msg, setMsg] = useState<string | null>(null)

  const doSave = useCallback(async () => {
    if (!projectId) return
    requestSaveNow()
    const time = new Date().toLocaleTimeString('fr-FR')
    try {
      const cfg = loadCloudConfig()
      if (cfg?.enabled) {
        const st = await syncProjectWithBackup(projectId, cfg)
        setMsg(`💾 ${ACTION_LABELS[st.action]} · ${time}`)
      } else {
        await db.projects.update(projectId, { updatedAt: Date.now() })
        setMsg(`💾 Enregistré localement · ${time}`)
      }
    } catch (err) {
      setMsg(`💾 Erreur : ${err instanceof Error ? err.message : 'inconnue'}`)
    }
    window.setTimeout(() => setMsg(null), 3200)
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void doSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [projectId, doSave])

  if (!projectId) return null

  return (
    <div className="save-wrap">
      <button
        type="button"
        className="btn-icon save-btn"
        title="Enregistrer (Ctrl+S)"
        aria-label="Enregistrer le projet"
        onClick={() => void doSave()}
      >
        💾
      </button>
      {msg && <span className="save-msg">{msg}</span>}
    </div>
  )
}
