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
}

function ChecklistItem({
  item,
  selectedId,
  onSelect,
  onToggle,
}: {
  item: ItemWithStatus
  selectedId: string | null
  onSelect: (id: string) => void
  onToggle: (id: string) => void
}) {
  return (
    <li
      className={`checklist-item ${item.completed ? 'completed' : ''} ${selectedId === item.id ? 'selected' : ''}`}
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
          <span className="checklist-name">{item.name}</span>
          {item.category === 'achievement' && item.description && (
            <span className="checklist-subtitle">{item.description}</span>
          )}
          {item.category === 'collectopaedia' && (item.collectType || item.description) && (
            <span className="checklist-subtitle">
              {[item.collectType, item.description].filter(Boolean).join(' · ')}
            </span>
          )}
          {item.category === 'item' && item.collectType && (
            <span className="checklist-subtitle">{item.collectType}</span>
          )}
        </div>
        <div className="checklist-meta">
          {item.region && <span className="meta-small">{item.region}</span>}
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
}: ChecklistProps) {
  if (items.length === 0) {
    return <p className="empty-state">No entries found.</p>
  }

  if (groups && groups.length > 0) {
    return (
      <div className="checklist-grouped">
        {groups.map((group) => (
          <section key={group.depth} className="checklist-group">
            <h3 className="checklist-group-title">{group.label}</h3>
            <ul className="checklist">
              {group.items.map((item) => {
                const withStatus = items.find((i) => i.id === item.id)
                if (!withStatus) return null
                return (
                  <ChecklistItem
                    key={item.id}
                    item={withStatus}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    onToggle={onToggle}
                  />
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    )
  }

  return (
    <ul className="checklist">
      {items.map((item) => (
        <ChecklistItem
          key={item.id}
          item={item}
          selectedId={selectedId}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}
    </ul>
  )
}
