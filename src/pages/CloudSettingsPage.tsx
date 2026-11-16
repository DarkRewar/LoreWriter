import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { b64encodeUnicode, clearCloudConfig, loadCloudConfig, saveCloudConfig, type CloudConfig } from '../lib/cloud'

export default function CloudSettingsPage() {
  const [config, setConfig] = useState<CloudConfig>(() => loadCloudConfig() ?? {
    provider: 'webdav',
    baseUrl: '',
    username: '',
    password: '',
    folder: 'LoreWriter',
    enabled: false,
  })
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)

  const set = <K extends keyof CloudConfig>(key: K, value: CloudConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }))

  const onSave = (e: FormEvent) => {
    e.preventDefault()
    saveCloudConfig(config)
    setStatus({ ok: true, message: 'Configuration enregistrée dans ce navigateur.' })
  }

  const onTest = async () => {
    setTesting(true)
    setStatus(null)
    try {
      const base = config.baseUrl.replace(/\/+$/, '')
      if (!base) throw new Error('Renseigne l\'URL de base WebDAV.')
      const res = await fetch(`${base}/`, {
        method: 'PROPFIND',
        headers: { Authorization: `Basic ${b64encodeUnicode(`${config.username}:${config.password}`)}`, Depth: '0' },
      })
      if (res.ok || res.status === 207) {
        setStatus({ ok: true, message: `Connexion réussie (HTTP ${res.status}). La synchro est prête.` })
      } else {
        setStatus({ ok: false, message: `Échec de la connexion (HTTP ${res.status}). Vérifie l'URL et les identifiants.` })
      }
    } catch {
      setStatus({ ok: false, message: 'Connexion impossible — vérifie que le serveur est joignable depuis ce navigateur.' })
    } finally {
      setTesting(false)
    }
  }

  const onClear = () => {
    clearCloudConfig()
    setConfig({ provider: 'webdav', baseUrl: '', username: '', password: '', folder: 'LoreWriter', enabled: false })
    setStatus({ ok: true, message: 'Configuration cloud supprimée.' })
  }

  return (
    <div className="page">
      <h1>☁️ Synchronisation cloud</h1>
      <p className="muted">
        LoreWriter fonctionne d'abord <strong>hors ligne</strong> : toutes vos données vivent dans ce navigateur
        (IndexedDB). La synchro cloud envoie ensuite chaque projet en <strong>plusieurs fichiers</strong> vers{' '}
        <strong>votre propre cloud</strong> via WebDAV — par exemple une instance Nextcloud/ownCloud.
      </p>

      <div className="note">
        🔒 Vos identifiants sont stockés uniquement dans le stockage local de ce navigateur et ne sont envoyés qu'à
        l'URL de votre serveur. Utilisez de préférence un <em>mot de passe d'application</em> (Nextcloud : Paramètres →
        Sécurité → Appareils et sessions).
      </div>

      <form onSubmit={onSave} style={{ maxWidth: 640 }}>
        <div className="panel">
          <h2>Serveur WebDAV</h2>
          <label className="field">
            <span>URL de base WebDAV</span>
            <input
              type="url"
              value={config.baseUrl}
              onChange={(e) => set('baseUrl', e.target.value)}
              placeholder="https://cloud.example.com/remote.php/dav/files/VOTRE_NOM"
            />
          </label>
          <label className="field">
            <span>Identifiant</span>
            <input type="text" value={config.username} onChange={(e) => set('username', e.target.value)} placeholder="alice" />
          </label>
          <label className="field">
            <span>Mot de passe (ou mot de passe d'application)</span>
            <input type="password" value={config.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••••" autoComplete="off" />
          </label>
          <label className="field">
            <span>Dossier distant</span>
            <input type="text" value={config.folder} onChange={(e) => set('folder', e.target.value)} placeholder="LoreWriter" />
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={config.enabled} onChange={(e) => set('enabled', e.target.checked)} style={{ width: 'auto' }} />
            <span>Activer la synchronisation automatique (au démarrage et toutes les 60 s)</span>
          </label>
        </div>

        <div className="btn-row">
          <button type="submit" className="btn btn-primary">
            Enregistrer
          </button>
          <button type="button" className="btn" onClick={onTest} disabled={testing}>
            {testing ? 'Test en cours…' : 'Tester la connexion'}
          </button>
          <button type="button" className="btn btn-danger" onClick={onClear}>
            Effacer la configuration
          </button>
        </div>
        {status && (
          <p className={status.ok ? 'muted' : 'form-error'} style={{ marginTop: 12 }}>
            {status.message}
          </p>
        )}
      </form>

      <div className="panel" style={{ maxWidth: 640, marginTop: 20 }}>
        <h2>Comment ça marche ?</h2>
        <p className="muted">
          Chaque projet est enregistré dans <code>{'/<dossier>/lorewriter/<id-projet>/'}</code> de votre cloud, en
          plusieurs fichiers : <code>project.json</code> (fichier de base : projet, personnages, relations, intrigues),{' '}
          <code>chapters/&lt;id&gt;.md</code> (un fichier Markdown dédié par chapitre) et{' '}
          <code>dialogues/&lt;id&gt;.json</code> (un fichier par scène de dialogue). À l'ouverture d'un projet,
          LoreWriter télécharge la version distante, fusionne entité par entité (la modification la plus récente
          gagne), puis renvoie le résultat. Ouvrez LoreWriter sur un autre appareil configuré avec le même cloud :
          vos projets se retrouvent automatiquement. Un ancien fichier unique <code>&lt;id-projet&gt;.json</code>{' '}
          est automatiquement migré vers ce format multi-fichiers.
        </p>
        <p className="muted">
          Astuce : pour héberger LoreWriter « de n'importe où », servez le dossier <code>dist/</code> (voir README)
          avec Docker/nginx sur votre serveur, ou utilisez l'application installée (PWA) hors ligne.
        </p>
        <Link to="/">← Retour aux projets</Link>
      </div>
    </div>
  )
}
