import { useState } from 'react'
import { useMatch } from 'react-router-dom'
import { loadCloudConfig, type SyncStatus } from '../lib/cloud'
import { syncProjectWithBackup } from '../lib/backup'

const ACTION_LABELS: Record<SyncStatus['action'], string> = {
  pushed: 'envoyé vers le cloud',
  'pulled-merged': 'fusionné avec le cloud',
  'up-to-date': 'déjà à jour',
  'nothing-remote': 'premier envoi vers le cloud',
}

/** Bouton « 🔄 Synchroniser maintenant » avec retour d'état (en cours / OK / erreur). */
export default function SyncNowButton() {
  const match = useMatch('/projects/:projectId/*')
  const projectId = match?.params.projectId ?? ''
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const enabled = Boolean(loadCloudConfig()?.enabled)

  const run = async () => {
    if (syncing || !projectId) return
    setSyncing(true)
    setMsg(null)
    try {
      const st = await syncProjectWithBackup(projectId)
      setMsg(`☁️ ${ACTION_LABELS[st.action]} · ${new Date(st.at).toLocaleTimeString('fr-FR')}`)
    } catch (err) {
      setMsg(`☁️ erreur de synchro : ${err instanceof Error ? err.message : 'inconnue'}`)
    } finally {
      setSyncing(false)
      window.setTimeout(() => setMsg(null), 5000)
    }
  }

  return (
    <div className="sync-now">
      <button type="button" className="btn sync-now-btn" onClick={() => void run()} disabled={!enabled || syncing}>
        {syncing ? '🔄 Synchronisation…' : '🔄 Synchroniser maintenant'}
      </button>
      {!enabled && <div className="sync-msg">Cloud non configuré — <a href="#/cloud">configurer</a></div>}
      {msg && <div className="sync-msg">{msg}</div>}
    </div>
  )
}
