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
  onToggleAccepted?: (id: string) => void
  onToggleCompleted?: (id: string) => void
  newIds?: Set<string>
  notesById?: Record<string, string | undefined>
  acceptedById?: Record<string, boolean>
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
  onToggleAccepted,
  onToggleCompleted,
  isNew,
  hasNotes,
  isAccepted,
}: {
  item: ItemWithStatus
  selectedId: string | null
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  onToggleAccepted?: (id: string) => void
  onToggleCompleted?: (id: string) => void
  isNew: boolean
  hasNotes: boolean
  isAccepted: boolean
}) {
  const isQuest = item.category === 'quest'
  const questSubregion = isQuest ? getQuestSubregion(item) : undefined
  const questSubtitle = isQuest
    ? [item.giver, questSubregion].filter(Boolean).join(' · ')
    : undefined

  const personSubtitle =
    item.category === 'person'
      ? [item.region, item.timeWindow].filter(Boolean).join(' · ')
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
      className={`checklist-item ${item.completed ? 'completed' : ''} ${isAccepted && !item.completed ? 'accepted' : ''} ${selectedId === item.id ? 'selected' : ''} ${isNew ? 'is-new' : ''}`}
    >
      {isQuest && onToggleAccepted && onToggleCompleted ? (
        <div className="quest-checks" onClick={(e) => e.stopPropagation()}>
          <label className="quest-check" title="Accepted">
            <input
              type="checkbox"
              checked={isAccepted || item.completed}
              onChange={() => onToggleAccepted(item.id)}
              aria-label={`Mark ${item.name} as accepted`}
            />
            <span>A</span>
          </label>
          <label className="quest-check" title="Completed">
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => onToggleCompleted(item.id)}
              aria-label={`Mark ${item.name} as complete`}
            />
            <span>✓</span>
          </label>
        </div>
      ) : (
        <input
          type="checkbox"
          className="checklist-checkbox"
          checked={item.completed}
          onChange={() => onToggle(item.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Mark ${item.name} as complete`}
        />
      )}
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
          {personSubtitle && (
            <span className="checklist-subtitle">{personSubtitle}</span>
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
        </div>
        <div className="checklist-meta">
          {item.category !== 'quest' && item.category !== 'person' && item.region && (
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
  onToggleAccepted,
  onToggleCompleted,
  newIds,
  notesById,
  acceptedById,
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
      onToggleAccepted={onToggleAccepted}
      onToggleCompleted={onToggleCompleted}
      isNew={newIds?.has(item.id) ?? false}
      hasNotes={Boolean(notesById?.[item.id]?.trim())}
      isAccepted={acceptedById?.[item.id] ?? false}
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
