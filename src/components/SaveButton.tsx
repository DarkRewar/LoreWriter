import { useCallback, useEffect, useState } from 'react'
import { useMatch } from 'react-router-dom'
import { db } from '../db'
import { loadCloudConfig } from '../lib/cloud'
import { syncProjectWithBackup } from '../lib/backup'
import { requestSaveNow } from '../lib/save'
import { useI18n, type MessageKey } from '../i18n'

export default function SaveButton() {
  const match = useMatch('/projects/:projectId/*')
  const projectId = match?.params.projectId ?? ''
  const { t, dateLocale } = useI18n()
  const [msg, setMsg] = useState<string | null>(null)

  const doSave = useCallback(async () => {
    if (!projectId) return
    requestSaveNow()
    const time = new Date().toLocaleTimeString(dateLocale)
    try {
      const cfg = loadCloudConfig()
      if (cfg?.enabled) {
        const st = await syncProjectWithBackup(projectId, cfg)
        const action = t(`layout.syncActions.${st.action}` as MessageKey)
        setMsg(t('saveButton.savedCloud', { action, time }))
      } else {
        await db.projects.update(projectId, { updatedAt: Date.now() })
        setMsg(t('saveButton.savedLocal', { time }))
      }
    } catch (err) {
      setMsg(t('saveButton.saveError', { error: err instanceof Error ? err.message : t('common.unknownError') }))
    }
    window.setTimeout(() => setMsg(null), 3200)
  }, [projectId, t, dateLocale])

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
        title={t('saveButton.title')}
        aria-label={t('saveButton.aria')}
        onClick={() => void doSave()}
      >
        💾
      </button>
      {msg && <span className="save-msg">{msg}</span>}
    </div>
  )
}
