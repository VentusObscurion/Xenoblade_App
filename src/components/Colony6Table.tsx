import {
  COLONY6_SECTIONS,
  estimateColony6Percent,
  estimateColony6Population,
  getAllColony6Levels,
  isImmigrantAvailable,
} from '../lib/colony6-levels.ts'
import {
  getPrerequisiteStatusColor,
  getPrerequisiteStatusLabel,
} from '../lib/prerequisites.ts'
import type { GameState } from '../types/game-state.ts'
import type { ItemWithStatus, ProgressEntry, TrackableItem } from '../types/tracker.ts'

interface Colony6TableProps {
  items: ItemWithStatus[]
  immigrants: TrackableItem[]
  progress: Record<string, ProgressEntry>
  gameState: GameState
  onToggle: (id: string) => void
  onInvite: (id: string) => void
  onSelect?: (id: string) => void
  newIds?: Set<string>
  playthroughMode?: boolean
}

interface GroupedRow {
  item: ItemWithStatus
  levelRowspan: number
  goldRowspan: number
  showLevel: boolean
  showGold: boolean
}

function groupRows(items: ItemWithStatus[]): GroupedRow[] {
  const sorted = [...items].sort((a, b) => {
    const levelA = a.colonyLevel ?? 0
    const levelB = b.colonyLevel ?? 0
    if (levelA !== levelB) return levelA - levelB
    return a.name.localeCompare(b.name)
  })

  const grouped: GroupedRow[] = []
  let i = 0
  while (i < sorted.length) {
    const current = sorted[i]
    const level = current.colonyLevel
    const gold = current.colonyGold
    let span = 1
    while (
      i + span < sorted.length &&
      sorted[i + span].colonyLevel === level &&
      sorted[i + span].colonyGold === gold
    ) {
      span++
    }
    for (let j = 0; j < span; j++) {
      grouped.push({
        item: sorted[i + j],
        levelRowspan: span,
        goldRowspan: span,
        showLevel: j === 0,
        showGold: j === 0,
      })
    }
    i += span
  }
  return grouped
}

export function Colony6Table({
  items,
  immigrants,
  progress,
  gameState,
  onToggle,
  onInvite,
  onSelect,
  newIds,
  playthroughMode = true,
}: Colony6TableProps) {
  const levels = getAllColony6Levels(items, progress)
  const percent = Math.max(
    gameState.colony6Reconstruction,
    estimateColony6Percent(levels),
  )
  const population = estimateColony6Population(immigrants, progress)

  const bySection = new Map<string, ItemWithStatus[]>()
  for (const item of items) {
    const section = item.collectType ?? 'Other'
    const list = bySection.get(section) ?? []
    list.push(item)
    bySection.set(section, list)
  }

  const sections = COLONY6_SECTIONS.filter((s) => bySection.has(s))

  const visibleImmigrants = immigrants.filter((imm) => {
    const invited =
      progress[imm.id]?.completed === true || progress[imm.id]?.accepted === true
    if (invited) return true
    if (!playthroughMode) return true
    return isImmigrantAvailable(
      imm,
      levels,
      percent,
      population,
      gameState,
      immigrants,
      progress,
    )
  })

  if (sections.length === 0 && visibleImmigrants.length === 0) {
    return <p className="empty-state">No entries found.</p>
  }

  return (
    <div className="wiki-tables">
      <section className="wiki-table-section colony6-levels-panel">
        <h3 className="wiki-table-region">Reconstruction levels</h3>
        <p className="playthrough-hint">
          Levels rise automatically when you complete all materials for that tier.
          Approx. {percent}% · population ~{population}
        </p>
        <div className="colony6-level-grid">
          {COLONY6_SECTIONS.map((section) => (
            <div key={section} className="colony6-level-chip">
              <strong>{section}</strong>
              <span>Lv {levels[section]}</span>
            </div>
          ))}
        </div>
      </section>

      {sections.map((section) => {
        const rows = groupRows(bySection.get(section)!)
        return (
          <section key={section} className="wiki-table-section">
            <h3 className="wiki-table-region">
              {section}{' '}
              <span className="colony6-level-inline">Lv {levels[section as keyof typeof levels]}</span>
            </h3>
            <div className="wiki-table-wrap">
              <table className="wiki-table">
                <thead>
                  <tr>
                    <th>Level</th>
                    <th>Gold</th>
                    <th>Items needed</th>
                    <th>Obtained from</th>
                    <th>Status</th>
                    <th className="wiki-table-check-col">Done</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ item, levelRowspan, goldRowspan, showLevel, showGold }) => {
                    const isNew = newIds?.has(item.id) ?? false
                    return (
                      <tr
                        key={item.id}
                        className={`${item.completed ? 'row-completed' : ''} ${isNew ? 'is-new' : ''}`}
                        onClick={() => onSelect?.(item.id)}
                      >
                        {showLevel && (
                          <td rowSpan={levelRowspan}>{item.colonyLevel ?? '—'}</td>
                        )}
                        {showGold && (
                          <td rowSpan={goldRowspan}>{item.colonyGold ?? '—'}</td>
                        )}
                        <td>
                          {isNew && <span className="new-badge">New</span>}
                          {item.name}
                        </td>
                        <td className="wiki-table-source">{item.obtainedFrom ?? '—'}</td>
                        <td>
                          <span
                            className="status-dot"
                            title={getPrerequisiteStatusLabel(item.prerequisiteStatus)}
                            style={{
                              backgroundColor: getPrerequisiteStatusColor(
                                item.prerequisiteStatus,
                              ),
                            }}
                          />
                        </td>
                        <td className="wiki-table-check-col">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => onToggle(item.id)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Mark ${item.name} as complete`}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}

      <section className="wiki-table-section">
        <h3 className="wiki-table-region">Immigrants</h3>
        <p className="playthrough-hint">
          Invite NPCs once reconstruction levels unlock them. Inviting unlocks their
          Colony 6 quests.
        </p>
        <div className="wiki-table-wrap">
          <table className="wiki-table">
            <thead>
              <tr>
                <th>NPC</th>
                <th>From</th>
                <th>Conditions</th>
                <th className="wiki-table-check-col">Invited</th>
              </tr>
            </thead>
            <tbody>
              {visibleImmigrants.map((imm) => {
                const invited =
                  progress[imm.id]?.completed === true ||
                  progress[imm.id]?.accepted === true
                const isNew = newIds?.has(imm.id) ?? false
                const available = isImmigrantAvailable(
                  imm,
                  levels,
                  percent,
                  population,
                  gameState,
                  immigrants,
                  progress,
                )
                return (
                  <tr
                    key={imm.id}
                    className={`${invited ? 'row-completed' : ''} ${isNew ? 'is-new' : ''} ${!available && !invited ? 'row-blocked' : ''}`}
                    onClick={() => onSelect?.(imm.id)}
                  >
                    <td>
                      {isNew && <span className="new-badge">New</span>}
                      {imm.name}
                    </td>
                    <td>{imm.region ?? '—'}</td>
                    <td className="wiki-table-source">
                      {imm.description ?? imm.obtainedFrom ?? '—'}
                    </td>
                    <td className="wiki-table-check-col">
                      <input
                        type="checkbox"
                        checked={invited}
                        onChange={() => onInvite(imm.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Mark ${imm.name} as invited`}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
