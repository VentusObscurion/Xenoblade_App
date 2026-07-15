import { useState } from 'react'
import { GameSelect } from './components/GameSelect.tsx'
import { CategoryView } from './pages/CategoryView.tsx'
import { SettingsPage } from './pages/SettingsPage.tsx'
import type { GameId } from './types/tracker.ts'
import './App.css'

type View = 'tracker' | 'settings'

function App() {
  const [gameId, setGameId] = useState<GameId>('xc1')
  const [view, setView] = useState<View>('tracker')

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <h1>Xenoblade Tracker</h1>
          <nav className="header-nav">
            <button
              className={view === 'tracker' ? 'active' : ''}
              onClick={() => setView('tracker')}
            >
              Tracker
            </button>
            <button
              className={view === 'settings' ? 'active' : ''}
              onClick={() => setView('settings')}
            >
              Settings
            </button>
          </nav>
        </div>
        {view === 'tracker' && (
          <GameSelect selected={gameId} onSelect={setGameId} />
        )}
      </header>

      <main className="app-main">
        {view === 'tracker' ? (
          <CategoryView key={gameId} gameId={gameId} />
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
