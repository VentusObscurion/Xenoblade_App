import type { ItemWithStatus } from '../types/tracker.ts'
import {
  getPrerequisiteStatusColor,
  getPrerequisiteStatusLabel,
} from '../lib/prerequisites.ts'

interface Colony6TableProps {
  items: ItemWithStatus[]
  onToggle: (id: string) => void
  onSelect?: (id: string) => void
  newIds?: Set<string>
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
  onToggle,
  onSelect,
  newIds,
}: Colony6TableProps) {
  const bySection = new Map<string, ItemWithStatus[]>()
  for (const item of items) {
    const section = item.collectType ?? 'Other'
    const list = bySection.get(section) ?? []
    list.push(item)
    bySection.set(section, list)
  }

  const sections = ['Housing', 'Commerce', 'Nature', 'Special'].filter((s) =>
    bySection.has(s),
  )

  if (sections.length === 0) {
    return <p className="empty-state">No entries found.</p>
  }

  return (
    <div className="wiki-tables">
      {sections.map((section) => {
        const rows = groupRows(bySection.get(section)!)
        return (
          <section key={section} className="wiki-table-section">
            <h3 className="wiki-table-region">{section}</h3>
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
    </div>
  )
}
