import { useEffect, useState } from 'react'
import {
  readAppRoute,
  writeAppRoute,
  type AppRoute,
  type AppView,
} from './lib/app-route.ts'
import { GameSelect } from './components/GameSelect.tsx'
import { CategoryView } from './pages/CategoryView.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { PlaythroughPage } from './pages/PlaythroughPage.tsx'
import { SettingsPage } from './pages/SettingsPage.tsx'
import { useGameState } from './hooks/useGameState.ts'
import {
  gameSupportsPlaythrough,
} from './types/playthrough-config.ts'
import type { Category, GameId } from './types/tracker.ts'
import './App.css'

function App() {
  const [route, setRoute] = useState<AppRoute>(() => readAppRoute())
  const {
    gameState,
    setPlayerLevel,
    setAreaAffinity,
    setAreaDiscovered,
    setPartyMember,
    setCharacterAffinity,
    setStoryFlag,
    setColony6Reconstruction,
  } = useGameState(route.gameId)

  useEffect(() => {
    writeAppRoute(route)
  }, [route])

  useEffect(() => {
    const onHashChange = () => setRoute(readAppRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const setView = (view: AppView) => {
    setRoute((prev) => ({
      ...prev,
      view,
      category: view === 'tracker' ? prev.category : undefined,
    }))
  }

  const setGameId = (gameId: GameId) => {
    setRoute((prev) => {
      const nextView =
        prev.view === 'playthrough' && !gameSupportsPlaythrough(gameId)
          ? 'dashboard'
          : prev.view
      return { gameId, view: nextView, category: undefined }
    })
  }

  const handleNavigateToCategory = (category: Category) => {
    setRoute((prev) => ({
      ...prev,
      view: 'tracker',
      category,
    }))
  }

  const handleTrackerCategoryChange = (category: Category) => {
    setRoute((prev) => ({ ...prev, view: 'tracker', category }))
  }

  const { gameId, view, category: trackerCategory } = route

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <h1>Xenoblade Tracker</h1>
          <nav className="header-nav">
            <button
              className={view === 'dashboard' ? 'active' : ''}
              onClick={() => setView('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={view === 'tracker' ? 'active' : ''}
              onClick={() =>
                setRoute((prev) => ({
                  ...prev,
                  view: 'tracker',
                  category: undefined,
                }))
              }
            >
              Tracker
            </button>
            {gameSupportsPlaythrough(gameId) && (
              <button
                className={view === 'playthrough' ? 'active' : ''}
                onClick={() => setView('playthrough')}
              >
                Playthrough
              </button>
            )}
            <button
              className={view === 'settings' ? 'active' : ''}
              onClick={() => setView('settings')}
            >
              Settings
            </button>
          </nav>
        </div>
        {view !== 'settings' && (
          <GameSelect selected={gameId} onSelect={setGameId} />
        )}
      </header>

      <main className="app-main">
        {view === 'dashboard' ? (
          <DashboardPage gameId={gameId} onNavigate={handleNavigateToCategory} />
        ) : view === 'playthrough' ? (
          <PlaythroughPage
            gameId={gameId}
            gameState={gameState}
            onLevelChange={setPlayerLevel}
            onAffinityChange={setAreaAffinity}
            onDiscoveredChange={setAreaDiscovered}
            onPartyMemberChange={setPartyMember}
            onCharacterAffinityChange={setCharacterAffinity}
            onStoryFlagChange={setStoryFlag}
            onColony6Change={setColony6Reconstruction}
          />
        ) : view === 'tracker' ? (
          <CategoryView
            key={gameId}
            gameId={gameId}
            initialCategory={trackerCategory}
            onCategoryChange={handleTrackerCategoryChange}
          />
        ) : (
          <SettingsPage />
        )}
      </main>

      <footer className="app-footer">
        <p>
          Data from{' '}
          <a
            href="https://xenoblade.fandom.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Xenoblade Wiki
          </a>{' '}
          (CC BY-SA 3.0)
        </p>
      </footer>
    </div>
  )
}

export default App
