import { AFFINITY_COLOR_HEX } from '../lib/format-display.ts'
import { formatH2HAffinityShort } from '../lib/h2h-availability.ts'
import {
  getPrerequisiteStatusColor,
  getPrerequisiteStatusLabel,
} from '../lib/prerequisites.ts'
import type { QuestGroup } from '../lib/quest-ordering.ts'
import type { ItemWithStatus } from '../types/tracker.ts'

interface ChecklistProps {
  items: ItemWithStatus[]
  groups?: QuestGroup[]
  selectedId: string | null
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  newIds?: Set<string>
  notesById?: Record<string, string | undefined>
}

function getQuestSubregion(item: ItemWithStatus): string | undefined {
  const location = item.subLocation || item.region
  if (!location) return undefined
  const paren = location.match(/\(([^)]+)\)\s*$/)
  if (paren) return paren[1]
  return undefined
}

function ChecklistItem({
  item,
  selectedId,
  onSelect,
  onToggle,
  isNew,
  hasNotes,
}: {
  item: ItemWithStatus
  selectedId: string | null
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  isNew: boolean
  hasNotes: boolean
}) {
  const questSubregion = item.category === 'quest' ? getQuestSubregion(item) : undefined
  const questSubtitle =
    item.category === 'quest'
      ? [item.giver, questSubregion].filter(Boolean).join(' · ')
      : undefined

  const h2hPair =
    item.category === 'heart_to_heart' && item.characters && item.characters.length >= 2
      ? item.characters.join(' & ')
      : undefined
  const h2hAffinity =
    item.category === 'heart_to_heart' && item.affinityLevel && item.affinityLevel > 0
      ? item.affinityLevel
      : undefined

  return (
    <li
      className={`checklist-item ${item.completed ? 'completed' : ''} ${selectedId === item.id ? 'selected' : ''} ${isNew ? 'is-new' : ''}`}
    >
      <input
        type="checkbox"
        className="checklist-checkbox"
        checked={item.completed}
        onChange={() => onToggle(item.id)}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Mark ${item.name} as complete`}
      />
      <button
        type="button"
        className="checklist-body"
        onClick={() => onSelect(item.id)}
      >
        <div className="checklist-text">
          <span className="checklist-name">
            {isNew && <span className="new-badge">New</span>}
            {item.name}
            {hasNotes && <span className="notes-indicator" title="Has notes">✎</span>}
          </span>
          {questSubtitle && (
            <span className="checklist-subtitle">{questSubtitle}</span>
          )}
          {(h2hPair || h2hAffinity) && (
            <span className="checklist-subtitle">
              {h2hPair}
              {h2hPair && h2hAffinity ? ' · ' : ''}
              {h2hAffinity !== undefined && (
                <span
                  className="h2h-affinity-label"
                  style={{ color: AFFINITY_COLOR_HEX[h2hAffinity] }}
                >
                  {formatH2HAffinityShort(h2hAffinity)}
                </span>
              )}
            </span>
          )}
          {item.category === 'collectopaedia' && (item.collectType || item.description) && (
            <span className="checklist-subtitle">
              {[item.collectType, item.description].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
        <div className="checklist-meta">
          {item.category !== 'quest' && item.region && (
            <span className="meta-small">{item.region}</span>
          )}
          {item.level !== undefined && (
            <span className="meta-small">Lv.{item.level}</span>
          )}
          <span
            className="status-dot"
            title={getPrerequisiteStatusLabel(item.prerequisiteStatus)}
            style={{
              backgroundColor: getPrerequisiteStatusColor(item.prerequisiteStatus),
            }}
          />
        </div>
      </button>
    </li>
  )
}

export function Checklist({
  items,
  groups,
  selectedId,
  onSelect,
  onToggle,
  newIds,
  notesById,
}: ChecklistProps) {
  if (items.length === 0) {
    return <p className="empty-state">No entries found.</p>
  }

  const renderItem = (item: ItemWithStatus) => (
    <ChecklistItem
      key={item.id}
      item={item}
      selectedId={selectedId}
      onSelect={onSelect}
      onToggle={onToggle}
      isNew={newIds?.has(item.id) ?? false}
      hasNotes={Boolean(notesById?.[item.id]?.trim())}
    />
  )

  if (groups && groups.length > 0) {
    return (
      <div className="checklist-grouped">
        {groups.map((group) => (
          <section key={group.label} className="checklist-group">
            <h3 className="checklist-group-title">{group.label}</h3>
            <ul className="checklist">
              {group.items.map((item) => {
                const withStatus = items.find((i) => i.id === item.id)
                if (!withStatus) return null
                return renderItem(withStatus)
              })}
            </ul>
          </section>
        ))}
      </div>
    )
  }

  return <ul className="checklist">{items.map(renderItem)}</ul>
}
