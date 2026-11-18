import { Link, Route, Routes } from 'react-router-dom'
import TopbarSearch from './components/TopbarSearch'
import SaveButton from './components/SaveButton'
import BurgerMenu from './components/BurgerMenu'
import LanguageMenu from './components/LanguageMenu'
import { ConfirmProvider } from './components/ConfirmDialog'
import { I18nProvider, useI18n } from './i18n'
import ProjectsPage from './pages/ProjectsPage'
import ProjectLayout from './pages/ProjectLayout'
import DashboardPage from './pages/DashboardPage'
import CharactersPage from './pages/CharactersPage'
import CharacterEditorPage from './pages/CharacterEditorPage'
import CharacterDetailPage from './pages/CharacterDetailPage'
import RelationshipsPage from './pages/RelationshipsPage'
import DialoguesPage from './pages/DialoguesPage'
import DialogueEditorPage from './pages/DialogueEditorPage'
import NovelPage from './pages/NovelPage'
import WikiPage from './pages/WikiPage'
import WikiEditorPage from './pages/WikiEditorPage'
import PlotsPage from './pages/PlotsPage'
import PlotEditorPage from './pages/PlotEditorPage'
import SearchPage from './pages/SearchPage'
import ProjectSettingsPage from './pages/ProjectSettingsPage'
import CloudSettingsPage from './pages/CloudSettingsPage'

function AppShell() {
  const { t } = useI18n()
  return (
    <ConfirmProvider>
    <div className="app">
      <header className="app-header">
        <BurgerMenu />
        <Link to="/" className="brand">
          ✒️ LoreWriter
        </Link>
        <LanguageMenu />
        <TopbarSearch />
        <SaveButton />
        <nav className="app-nav">
          <Link to="/">{t('app.projects')}</Link>
          <Link to="/cloud">{t('app.cloud')}</Link>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<ProjectsPage />} />
          <Route path="/cloud" element={<CloudSettingsPage />} />
          <Route path="/projects/:projectId" element={<ProjectLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="characters" element={<CharactersPage />} />
            <Route path="characters/new" element={<CharacterEditorPage />} />
            <Route path="characters/:characterId" element={<CharacterDetailPage />} />
            <Route path="characters/:characterId/edit" element={<CharacterEditorPage />} />
            <Route path="relations" element={<RelationshipsPage />} />
            <Route path="dialogues" element={<DialoguesPage />} />
            <Route path="dialogues/:sceneId" element={<DialogueEditorPage />} />
            <Route path="novel" element={<NovelPage />} />
            <Route path="wiki" element={<WikiPage />} />
            <Route path="wiki/:entryId" element={<WikiEditorPage />} />
            <Route path="plots" element={<PlotsPage />} />
            <Route path="plots/new" element={<PlotEditorPage />} />
            <Route path="plots/:plotId" element={<PlotEditorPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="settings" element={<ProjectSettingsPage />} />
          </Route>
          <Route
            path="*"
            element={
              <div className="page">
                <h1>{t('app.notFoundTitle')}</h1>
                <Link to="/">{t('app.backHome')}</Link>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
    </ConfirmProvider>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <AppShell />
    </I18nProvider>
  )
}
