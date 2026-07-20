import {
  characterPairKey,
  getCharacterPairs,
  type GameState,
} from '../types/game-state.ts'
import { getPlaythroughConfig } from '../types/playthrough-config.ts'
import type { GameId } from '../types/tracker.ts'
import { formatAffinityLevelWithColor } from '../lib/h2h-availability.ts'

const HALF_STAR_OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
const WHOLE_STAR_OPTIONS = [0, 1, 2, 3, 4, 5]
const CHARACTER_AFFINITY_OPTIONS = [0, 1, 2, 3, 4, 5]
const RECONSTRUCTION_PRESETS = [0, 15, 35, 55, 75, 95, 100]

function formatAreaAffinityLabel(value: number): string {
  if (value === 0) return '—'
  const full = Math.floor(value)
  const frac = value - full
  let suffix = ''
  if (frac >= 0.4 && frac < 0.6) suffix = '½'
  else if (frac >= 0.2 && frac < 0.4) suffix = '¼'
  else if (frac >= 0.7) suffix = '¾'
  return '★'.repeat(full) + suffix
}

interface PlaythroughPageProps {
  gameId: GameId
  gameState: GameState
  onLevelChange: (level: number) => void
  onAffinityChange: (area: string, stars: number) => void
  onDiscoveredChange: (area: string, discovered: boolean) => void
  onPartyMemberChange: (character: string, inParty: boolean) => void
  onCharacterAffinityChange: (charA: string, charB: string, level: number) => void
  onStoryFlagChange: (flagId: string, value: boolean) => void
  onColony6Change: (percent: number) => void
}

export function PlaythroughPage({
  gameId,
  gameState,
  onLevelChange,
  onAffinityChange,
  onDiscoveredChange,
  onPartyMemberChange,
  onCharacterAffinityChange,
  onStoryFlagChange,
  onColony6Change,
}: PlaythroughPageProps) {
  const config = getPlaythroughConfig(gameId)
  const characterPairs = config.hasCharacterAffinity
    ? getCharacterPairs(gameState.partyMembers)
    : []
  const affinityOptions =
    config.affinityStep === 'half' ? HALF_STAR_OPTIONS : WHOLE_STAR_OPTIONS

  return (
    <div className="playthrough-page">
      <h2>Playthrough</h2>
      <p className="playthrough-intro">
        Set your story progress, discovered areas, affinity charts, and party here.
        Tracker availability uses this when playthrough mode is on.
      </p>

      <section className="playthrough-section">
        <h3>Level</h3>
        <label className="game-state-field game-state-level">
          <span>Current level</span>
          <input
            type="number"
            min={1}
            max={99}
            value={gameState.playerLevel}
            onChange={(e) => onLevelChange(parseInt(e.target.value, 10) || 1)}
          />
        </label>
      </section>

      {config.storyFlags.length > 0 && (
        <section className="playthrough-section">
          <h3>Story Flags</h3>
          <p className="playthrough-hint">
            Mark major story beats that unlock later content.
          </p>
          <div className="story-flag-list">
            {config.storyFlags.map((flag) => (
              <label key={flag.id} className="story-flag-row">
                <input
                  type="checkbox"
                  checked={gameState.storyFlags[flag.id] ?? false}
                  onChange={(e) => onStoryFlagChange(flag.id, e.target.checked)}
                />
                <span>
                  <strong>{flag.label}</strong>
                  {flag.description && (
                    <span className="story-flag-desc">{flag.description}</span>
                  )}
                </span>
              </label>
            ))}
          </div>

          {config.hasColony6 && (
            <label className="game-state-field reconstruction-field">
              <span>Colony 6 Reconstruction</span>
              <div className="reconstruction-controls">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={gameState.colony6Reconstruction}
                  onChange={(e) =>
                    onColony6Change(parseInt(e.target.value, 10) || 0)
                  }
                />
                <strong>{gameState.colony6Reconstruction}%</strong>
              </div>
              <div className="reconstruction-presets">
                {RECONSTRUCTION_PRESETS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      gameState.colony6Reconstruction === value ? 'active' : ''
                    }
                    onClick={() => onColony6Change(value)}
                  >
                    {value}%
                  </button>
                ))}
              </div>
            </label>
          )}
        </section>
      )}

      {config.regions.length > 0 && (
        <section className="playthrough-section">
          <h3>Discovered Areas</h3>
          <p className="playthrough-hint">
            Map regions you have reached. Separate from affinity charts below.
          </p>
          <div className="game-state-regions">
            {config.regions.map((region) => {
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
                      onChange={(e) =>
                        onDiscoveredChange(region.id, e.target.checked)
                      }
                    />
                    <span className="region-name">{region.id}</span>
                  </label>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {config.affinityCharts.length > 0 && (
        <section className="playthrough-section">
          <h3>{config.affinityLabel}</h3>
          <p className="playthrough-hint">{config.affinityHint}</p>
          <div className="affinity-chart-grid">
            {config.affinityCharts.map((chart) => (
              <label key={chart} className="affinity-chart-row">
                <span>{chart}</span>
                <select
                  value={gameState.areaAffinity[chart] ?? 0}
                  onChange={(e) =>
                    onAffinityChange(chart, parseFloat(e.target.value))
                  }
                >
                  {affinityOptions.map((value) => (
                    <option key={value} value={value}>
                      {formatAreaAffinityLabel(value)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>
      )}

      {config.characters.length > 0 && (
        <section className="playthrough-section">
          <h3>{config.partyLabel}</h3>
          <div className="party-members">
            {config.characters.map((character) => (
              <label key={character} className="party-member-checkbox">
                <input
                  type="checkbox"
                  checked={gameState.partyMembers.includes(character)}
                  onChange={(e) =>
                    onPartyMemberChange(character, e.target.checked)
                  }
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
                        onCharacterAffinityChange(
                          a,
                          b,
                          parseInt(e.target.value, 10),
                        )
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
        </section>
      )}
    </div>
  )
}
