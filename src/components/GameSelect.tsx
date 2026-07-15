import { GAMES } from '../types/tracker.ts'
import type { GameId } from '../types/tracker.ts'

interface GameSelectProps {
  selected: GameId
  onSelect: (gameId: GameId) => void
}

export function GameSelect({ selected, onSelect }: GameSelectProps) {
  return (
    <div className="game-select">
      {GAMES.map((game) => (
        <button
          key={game.id}
          className={`game-card ${selected === game.id ? 'active' : ''} ${!game.available ? 'disabled' : ''}`}
          onClick={() => game.available && onSelect(game.id)}
          disabled={!game.available}
        >
          <span className="game-name">{game.name}</span>
          {!game.available && <span className="game-badge">Soon</span>}
        </button>
      ))}
    </div>
  )
}
