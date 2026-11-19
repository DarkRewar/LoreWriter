import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { isDesktopApp } from './lib/desktop'
import { requestSaveNow } from './lib/save'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)

// Mise à jour automatique de la PWA (#7) — pas dans l'app desktop Tauri (mécanisme propre).
if (!isDesktopApp()) {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, r) {
      // Vérifie les mises à jour en continu (en plus du check au chargement du SW).
      r?.update()
      const timer = setInterval(() => r?.update(), 30 * 60 * 1000)
      window.addEventListener('pagehide', () => clearInterval(timer))
    },
  })
  // Avant un rechargement (ex. activation d'un nouveau SW), vide les tampons des éditeurs
  // pour ne perdre aucune frappe en cours.
  window.addEventListener('beforeunload', () => requestSaveNow())
}
