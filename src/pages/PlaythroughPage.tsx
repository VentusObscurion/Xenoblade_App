import {
  characterPairKey,
  getCharacterPairs,
  XC1_AFFINITY_REGIONS,
  XC1_CHARACTERS,
  XC1_REGIONS,
  XC1_STORY_FLAGS,
  type GameState,
} from '../types/game-state.ts'
import { formatAffinityLevelWithColor } from '../lib/h2h-availability.ts'

const AREA_AFFINITY_OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
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
  gameState: GameState
  onLevelChange: (level: number) => void
  onAffinityChange: (area: string, stars: number) => void
  onDiscoveredChange: (area: string, discovered: boolean) => void
  onPartyMemberChange: (character: string, inParty: boolean) => void
  onPartyLeaderChange: (character: string) => void
  onCharacterAffinityChange: (charA: string, charB: string, level: number) => void
  onStoryFlagChange: (flagId: string, value: boolean) => void
  onColony6Change: (percent: number) => void
}

export function PlaythroughPage({
  gameState,
  onLevelChange,
  onAffinityChange,
  onDiscoveredChange,
  onPartyMemberChange,
  onPartyLeaderChange,
  onCharacterAffinityChange,
  onStoryFlagChange,
  onColony6Change,
}: PlaythroughPageProps) {
  const characterPairs = getCharacterPairs(gameState.partyMembers)

  return (
    <div className="playthrough-page">
      <h2>Playthrough</h2>
      <p className="playthrough-intro">
        Set your story progress, discovered areas, Affinity Charts, and party here.
        Quests and Heart-to-Hearts use this to decide what is available.
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

      <section className="playthrough-section">
        <h3>Story Flags</h3>
        <p className="playthrough-hint">
          Mark major story beats that unlock many late quests.
        </p>
        <div className="story-flag-list">
          {XC1_STORY_FLAGS.map((flag) => (
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

        <label className="game-state-field reconstruction-field">
          <span>Colony 6 Reconstruction</span>
          <div className="reconstruction-controls">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={gameState.colony6Reconstruction}
              onChange={(e) => onColony6Change(parseInt(e.target.value, 10) || 0)}
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
      </section>

      <section className="playthrough-section">
        <h3>Discovered Areas</h3>
        <p className="playthrough-hint">
          Map regions you have reached. Separate from Affinity Charts below.
        </p>
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
              </div>
            )
          })}
        </div>
      </section>

      <section className="playthrough-section">
        <h3>Affinity Charts</h3>
        <p className="playthrough-hint">
          The five area Affinity Charts (Colony 9, Colony 6, Central Bionis, Upper
          Bionis, Hidden Village).
        </p>
        <div className="affinity-chart-grid">
          {XC1_AFFINITY_REGIONS.map((region) => (
            <label key={region} className="affinity-chart-row">
              <span>{region}</span>
              <select
                value={gameState.areaAffinity[region] ?? 0}
                onChange={(e) => onAffinityChange(region, parseFloat(e.target.value))}
              >
                {AREA_AFFINITY_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {formatAreaAffinityLabel(value)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      <section className="playthrough-section">
        <h3>Party &amp; Character Affinity</h3>
        <p className="playthrough-hint">
          Used for Heart-to-Hearts and “joined the party” / “in the lead” quest
          requirements.
        </p>
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

        <label className="game-state-field">
          <span>Party leader</span>
          <select
            value={gameState.partyLeader}
            onChange={(e) => onPartyLeaderChange(e.target.value)}
          >
            {gameState.partyMembers.map((character) => (
              <option key={character} value={character}>
                {character}
              </option>
            ))}
          </select>
        </label>

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
      </section>
    </div>
  )
}
