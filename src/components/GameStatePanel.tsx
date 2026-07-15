import { XC1_REGIONS } from '../types/game-state.ts'
import type { GameState } from '../types/game-state.ts'

const AFFINITY_OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

function formatAffinityLabel(value: number): string {
  if (value === 0) return 'Affinity —'
  const full = Math.floor(value)
  const half = value % 1 !== 0
  return '★'.repeat(full) + (half ? '½' : '')
}

interface GameStatePanelProps {
  gameState: GameState
  onLevelChange: (level: number) => void
  onAffinityChange: (area: string, stars: number) => void
  onDiscoveredChange: (area: string, discovered: boolean) => void
}

export function GameStatePanel({
  gameState,
  onLevelChange,
  onAffinityChange,
  onDiscoveredChange,
}: GameStatePanelProps) {
  return (
    <section className="game-state-panel">
      <h3>Playthrough State</h3>
      <p className="game-state-hint">
        Only mark areas as discovered once you have reached them in-game.
        Content from undiscovered regions is hidden.
      </p>

      <label className="game-state-field game-state-level">
        <span>Level</span>
        <input
          type="number"
          min={1}
          max={99}
          value={gameState.playerLevel}
          onChange={(e) => onLevelChange(parseInt(e.target.value, 10) || 1)}
        />
      </label>

      <div className="game-state-regions">
        {XC1_REGIONS.map((region) => {
          const discovered = gameState.discoveredAreas[region.id] ?? false
          return (
            <div
              key={region.id}
              className={`game-state-region ${discovered ? 'discovered' : 'undiscovered'}`}
            >
              <label className="game-state-discovered">
                <input
                  type="checkbox"
                  checked={discovered}
                  onChange={(e) => onDiscoveredChange(region.id, e.target.checked)}
                />
                <span className="region-name">{region.id}</span>
              </label>

              {region.hasAffinity && (
                <select
                  className="game-state-affinity"
                  value={gameState.areaAffinity[region.id] ?? 0}
                  disabled={!discovered}
                  onChange={(e) =>
                    onAffinityChange(region.id, parseFloat(e.target.value))
                  }
                >
                  {AFFINITY_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {formatAffinityLabel(value)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
