import {
  characterPairKey,
  getCharacterPairs,
  XC1_CHARACTERS,
  XC1_REGIONS,
} from '../types/game-state.ts'
import type { GameState } from '../types/game-state.ts'
import { formatAffinityLevelWithColor } from '../lib/h2h-availability.ts'

const AREA_AFFINITY_OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
const CHARACTER_AFFINITY_OPTIONS = [0, 1, 2, 3, 4, 5]

function formatAreaAffinityLabel(value: number): string {
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
  onPartyMemberChange: (character: string, inParty: boolean) => void
  onCharacterAffinityChange: (charA: string, charB: string, level: number) => void
}

export function GameStatePanel({
  gameState,
  onLevelChange,
  onAffinityChange,
  onDiscoveredChange,
  onPartyMemberChange,
  onCharacterAffinityChange,
}: GameStatePanelProps) {
  const characterPairs = getCharacterPairs(gameState.partyMembers)

  return (
    <section className="game-state-panel">
      <h3>Playthrough State</h3>
      <p className="game-state-hint">
        Mark discovered areas, set your party and character affinities to filter
        available heart-to-hearts.
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

      <details className="game-state-details" open>
        <summary>Party &amp; Character Affinity</summary>
        <div className="party-members">
          {XC1_CHARACTERS.map((character) => (
            <label key={character} className="party-member-checkbox">
              <input
                type="checkbox"
                checked={gameState.partyMembers.includes(character)}
                onChange={(e) => onPartyMemberChange(character, e.target.checked)}
              />
              {character}
            </label>
          ))}
        </div>
        {characterPairs.length > 0 && (
          <div className="character-affinity-list">
            {characterPairs.map(([a, b]) => {
              const key = characterPairKey(a, b)
              const value = gameState.characterAffinity[key] ?? 0
              return (
                <label key={key} className="character-affinity-row">
                  <span>{key}</span>
                  <select
                    value={value}
                    onChange={(e) =>
                      onCharacterAffinityChange(a, b, parseInt(e.target.value, 10))
                    }
                  >
                    {CHARACTER_AFFINITY_OPTIONS.map((level) => (
                      <option key={level} value={level}>
                        {formatAffinityLevelWithColor(level)}
                      </option>
                    ))}
                  </select>
                </label>
              )
            })}
          </div>
        )}
      </details>

      <details className="game-state-details">
        <summary>Discovered Areas &amp; Area Affinity</summary>
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
                    {AREA_AFFINITY_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {formatAreaAffinityLabel(value)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )
          })}
        </div>
      </details>
    </section>
  )
}
