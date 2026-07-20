import { isColony6MaterialAvailable } from './colony6-availability.ts'
import { isH2HAvailable } from './h2h-availability.ts'
import { filterAvailableQuests } from './quest-ordering.ts'
import { isItemAvailable } from './prerequisites.ts'
import { filterByDiscoveredRegions } from './region-discovery.ts'
import type { GameState } from '../types/game-state.ts'
import type { ProgressEntry, TrackableItem } from '../types/tracker.ts'

/** Compute IDs that are currently actionable in playthrough mode. */
export function collectAvailableItemIds(
  items: TrackableItem[],
  progress: Record<string, ProgressEntry>,
  gameState: GameState,
): string[] {
  const allQuests = items.filter((i) => i.category === 'quest')
  const ids: string[] = []

  for (const item of items) {
    if (progress[item.id]?.completed) continue

    if (item.category === 'quest') {
      const available = filterAvailableQuests(
        [item],
        allQuests,
        progress,
        gameState,
      )
      if (available.length > 0) ids.push(item.id)
      continue
    }

    if (item.category === 'heart_to_heart') {
      if (isH2HAvailable(item, progress, gameState)) ids.push(item.id)
      continue
    }

    if (item.category === 'unique_monster') {
      if (
        filterByDiscoveredRegions([item], gameState).length > 0 &&
        isItemAvailable(item, progress, items, gameState)
      ) {
        ids.push(item.id)
      }
      continue
    }

    if (item.category === 'colony_reconstruction') {
      if (isColony6MaterialAvailable(item.obtainedFrom, gameState)) {
        ids.push(item.id)
      }
      continue
    }
  }

  return ids
}
