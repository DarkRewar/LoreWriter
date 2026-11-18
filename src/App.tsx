import { Link, Route, Routes } from 'react-router-dom'
import TopbarSearch from './components/TopbarSearch'
import SaveButton from './components/SaveButton'
import BurgerMenu from './components/BurgerMenu'
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
import PlotsPage from './pages/PlotsPage'
import PlotEditorPage from './pages/PlotEditorPage'
import SearchPage from './pages/SearchPage'
import ProjectSettingsPage from './pages/ProjectSettingsPage'
import CloudSettingsPage from './pages/CloudSettingsPage'

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <BurgerMenu />
        <Link to="/" className="brand">
          ✒️ LoreWriter
        </Link>
        <TopbarSearch />
        <SaveButton />
        <nav className="app-nav">
          <Link to="/">Projets</Link>
          <Link to="/cloud">☁️ Cloud</Link>
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
                <h1>Page introuvable</h1>
                <Link to="/">Retour à l'accueil</Link>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  )
}
