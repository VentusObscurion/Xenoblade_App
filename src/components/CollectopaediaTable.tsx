import { useMemo, useState } from 'react'
import { collectopaediaSlotId, compareCollectopaediaTypes, sortCollectopaediaRegions } from '../lib/collectopaedia.ts'
import { findItemByName } from '../lib/item-lookup.ts'
import { isRegionIdDiscovered } from '../lib/region-discovery.ts'
import type { GameState } from '../types/game-state.ts'
import type { ItemWithStatus, TrackableItem } from '../types/tracker.ts'

interface CollectopaediaTableProps {
  items: ItemWithStatus[]
  progress: Record<string, { completed?: boolean }>
  onToggleSlot: (slotId: string) => void
  gameState: GameState
  itemLookup: Map<string, TrackableItem>
}

export function CollectopaediaTable({
  items,
  progress,
  onToggleSlot,
  gameState,
  itemLookup,
}: CollectopaediaTableProps) {
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null)

  const byRegion = useMemo(() => {
    const map = new Map<string, ItemWithStatus[]>()
    for (const item of items) {
      const region = item.region ?? 'Unknown'
      const list = map.get(region) ?? []
      list.push(item)
      map.set(region, list)
    }
    return map
  }, [items])

  const regions = sortCollectopaediaRegions([...byRegion.keys()])

  const selectedItem = selectedItemName
    ? findItemByName(itemLookup, selectedItemName)
    : undefined

  if (regions.length === 0) {
    return <p className="empty-state">No entries found.</p>
  }

  return (
    <div className="collectopaedia-layout">
      <div className="wiki-tables">
        {regions.map((region) => {
          const discovered = isRegionIdDiscovered(region, gameState)
          return (
            <details
              key={region}
              className={`wiki-table-section collectopaedia-region ${discovered ? 'discovered' : 'undiscovered'}`}
            >
              <summary className="wiki-table-region">
                {region}
                {!discovered && <span className="region-locked"> — not discovered</span>}
              </summary>
              <div className="wiki-table-wrap">
                <table className="wiki-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>1</th>
                      <th>2</th>
                      <th>3</th>
                      <th>4</th>
                      <th>5</th>
                      <th>Reward</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byRegion
                      .get(region)!
                      .sort((a, b) =>
                        compareCollectopaediaTypes(
                          a.collectType ?? '',
                          b.collectType ?? '',
                        ),
                      )
                      .map((set) => (
                      <tr key={set.id}>
                        <td className="wiki-table-type">{set.collectType ?? set.name}</td>
                        {(set.collectopaediaSlots ?? []).map((slot, index) => (
                          <td key={index} className="wiki-table-slot">
                            {slot ? (
                              <label className="slot-cell">
                                <input
                                  type="checkbox"
                                  checked={
                                    progress[collectopaediaSlotId(set.id, index)]?.completed ??
                                    false
                                  }
                                  onChange={() =>
                                    onToggleSlot(collectopaediaSlotId(set.id, index))
                                  }
                                  aria-label={`Mark ${slot} as collected`}
                                />
                                <button
                                  type="button"
                                  className="slot-item-name"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    setSelectedItemName(slot)
                                  }}
                                >
                                  {slot}
                                </button>
                              </label>
                            ) : (
                              <span className="slot-empty">—</span>
                            )}
                          </td>
                        ))}
                        <td className="wiki-table-reward">{set.rewards?.[0] ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )
        })}
      </div>

      {selectedItem && (
        <aside className="collectopaedia-item-detail">
          <div className="item-detail-header">
            <h3>{selectedItem.name}</h3>
            <button
              className="btn-close"
              onClick={() => setSelectedItemName(null)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          {selectedItem.itemLocations && selectedItem.itemLocations.length > 0 && (
            <p>
              <strong>Location:</strong> {selectedItem.itemLocations.join(', ')}
            </p>
          )}
          {selectedItem.itemHasTrade && (
            <p>
              <strong>Trade:</strong>{' '}
              {selectedItem.itemTradeInfo?.length
                ? selectedItem.itemTradeInfo.join('; ')
                : 'Available via NPC trade'}
            </p>
          )}
          {selectedItem.itemGifting && (
            <p>
              <strong>Gifting:</strong> {selectedItem.itemGifting}
            </p>
          )}
          {selectedItem.itemQuestUses && selectedItem.itemQuestUses.length > 0 && (
            <p>
              <strong>Quests:</strong> {selectedItem.itemQuestUses.join('; ')}
            </p>
          )}
          {selectedItem.description && (
            <p>
              <strong>Description:</strong> {selectedItem.description}
            </p>
          )}
          <a href={selectedItem.wikiUrl} target="_blank" rel="noopener noreferrer">
            View on Wiki →
          </a>
        </aside>
      )}
    </div>
  )
}
