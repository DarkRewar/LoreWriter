import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  b64encodeUnicode,
  clearCloudConfig,
  loadCloudConfig,
  saveCloudConfig,
  type BackupMode,
  type CloudConfig,
} from '../lib/cloud'
import { isDesktopApp, pickDirectoryNative } from '../lib/desktop'
import { useI18n } from '../i18n'

const DEFAULT_CONFIG: CloudConfig = {
  provider: 'webdav',
  baseUrl: '',
  username: '',
  password: '',
  folder: 'LoreWriter',
  enabled: false,
  backupMode: 'off',
}

export default function CloudSettingsPage() {
  const { t } = useI18n()
  const [config, setConfig] = useState<CloudConfig>(() => loadCloudConfig() ?? DEFAULT_CONFIG)
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)

  const set = <K extends keyof CloudConfig>(key: K, value: CloudConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }))

  const onSave = (e: FormEvent) => {
    e.preventDefault()
    saveCloudConfig(config)
    setStatus({ ok: true, message: t('cloud.saved') })
  }

  const onTest = async () => {
    setTesting(true)
    setStatus(null)
    try {
      const base = config.baseUrl.replace(/\/+$/, '')
      if (!base) throw new Error(t('cloud.urlRequired'))
      const res = await fetch(`${base}/`, {
        method: 'PROPFIND',
        headers: { Authorization: `Basic ${b64encodeUnicode(`${config.username}:${config.password}`)}`, Depth: '0' },
      })
      if (res.ok || res.status === 207) {
        setStatus({ ok: true, message: t('cloud.testOk', { status: res.status }) })
      } else {
        setStatus({ ok: false, message: t('cloud.testFail', { status: res.status }) })
      }
    } catch {
      setStatus({ ok: false, message: t('cloud.testUnreachable') })
    } finally {
      setTesting(false)
    }
  }

  const onClear = () => {
    clearCloudConfig()
    setConfig(DEFAULT_CONFIG)
    setStatus({ ok: true, message: t('cloud.cleared') })
  }

  const onPickBackupDir = async () => {
    const dir = await pickDirectoryNative()
    if (dir) set('backupDir', dir)
  }

  return (
    <div className="page">
      <h1>{t('cloud.title')}</h1>
      <p className="muted">
        {t('cloud.intro')}</p>

      <div className="note">
        {t('cloud.securityNote')}</div>

      <form onSubmit={onSave} style={{ maxWidth: 640 }}>
        <div className="panel">
          <h2>{t('cloud.server')}</h2>
          <label className="field">
            <span>{t('cloud.baseUrl')}</span>
            <input
              type="url"
              value={config.baseUrl}
              onChange={(e) => set('baseUrl', e.target.value)}
              placeholder={t('cloud.baseUrlPlaceholder')}
            />
          </label>
          <label className="field">
            <span>{t('cloud.username')}</span>
            <input type="text" value={config.username} onChange={(e) => set('username', e.target.value)} placeholder={t('cloud.usernamePlaceholder')} />
          </label>
          <label className="field">
            <span>{t('cloud.password')}</span>
            <input type="password" value={config.password} onChange={(e) => set('password', e.target.value)} placeholder={t('cloud.passwordPlaceholder')} autoComplete="off" />
          </label>
          <label className="field">
            <span>{t('cloud.folder')}</span>
            <input type="text" value={config.folder} onChange={(e) => set('folder', e.target.value)} placeholder="LoreWriter" />
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={config.enabled} onChange={(e) => set('enabled', e.target.checked)} style={{ width: 'auto' }} />
            <span>{t('cloud.enabled')}</span>
          </label>
        </div>

        <div className="panel">
          <h2>{t('cloud.backupTitle')}</h2>
          <label className="field">
            <span>{t('cloud.backupFreq')}</span>
            <select
              value={config.backupMode ?? 'off'}
              onChange={(e) => set('backupMode', e.target.value as BackupMode)}
            >
              <option value="off">{t('cloud.backupOff')}</option>
              <option value="each-sync">{t('cloud.backupEachSync')}</option>
              <option value="daily">{t('cloud.backupDaily')}</option>
            </select>
          </label>
          {(config.backupMode ?? 'off') !== 'off' &&
            (isDesktopApp() ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="button" className="btn" onClick={() => void onPickBackupDir()}>
                  {config.backupDir ? t('cloud.changeDir') : t('cloud.chooseDir')}
                </button>
                <span className="muted">
                  {config.backupDir ?? t('cloud.noDir')}
                </span>
              </div>
            ) : (
              <p className="muted">{t('cloud.browserNote')}</p>
            ))}
        </div>

        <div className="btn-row">
          <button type="submit" className="btn btn-primary">
            {t('cloud.save')}
          </button>
          <button type="button" className="btn" onClick={onTest} disabled={testing}>
            {testing ? t('cloud.testing') : t('cloud.test')}
          </button>
          <button type="button" className="btn btn-danger" onClick={onClear}>
            {t('cloud.clear')}
          </button>
        </div>
        {status && (
          <p className={status.ok ? 'muted' : 'form-error'} style={{ marginTop: 12 }}>
            {status.message}
          </p>
        )}
      </form>

      <div className="panel" style={{ maxWidth: 640, marginTop: 20 }}>
        <h2>{t('cloud.howTitle')}</h2>
        <p className="muted">
          {t('cloud.howText1')}</p>
        <p className="muted">
          {t('cloud.howText2')}</p>
        <Link to="/">{t('cloud.back')}</Link>
      </div>
    </div>
  )
}
