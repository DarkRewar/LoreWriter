import { useState } from 'react'
import { useMatch } from 'react-router-dom'
import { loadCloudConfig } from '../lib/cloud'
import { syncProjectWithBackup } from '../lib/backup'
import { useI18n, type MessageKey } from '../i18n'

/** Bouton « 🔄 Synchroniser maintenant » avec retour d'état (en cours / OK / erreur). */
export default function SyncNowButton() {
  const match = useMatch('/projects/:projectId/*')
  const projectId = match?.params.projectId ?? ''
  const { t, dateLocale } = useI18n()
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const enabled = Boolean(loadCloudConfig()?.enabled)

  const run = async () => {
    if (syncing || !projectId) return
    setSyncing(true)
    setMsg(null)
    try {
      const st = await syncProjectWithBackup(projectId)
      const action = t(`layout.syncActions.${st.action}` as MessageKey)
      setMsg(t('syncButton.syncOk', { action, time: new Date(st.at).toLocaleTimeString(dateLocale) }))
    } catch (err) {
      setMsg(t('syncButton.syncError', { error: err instanceof Error ? err.message : t('common.unknownError') }))
    } finally {
      setSyncing(false)
      window.setTimeout(() => setMsg(null), 5000)
    }
  }

  return (
    <div className="sync-now">
      <button type="button" className="btn sync-now-btn" onClick={() => void run()} disabled={!enabled || syncing}>
        {syncing ? t('syncButton.syncing') : t('syncButton.syncNow')}
      </button>
      {!enabled && (
        <div className="sync-msg">
          {t('syncButton.notConfigured')} <a href="#/cloud">{t('syncButton.configure')}</a>
        </div>
      )}
      {msg && <div className="sync-msg">{msg}</div>}
    </div>
  )
}
