import { isColony6NextLevelMaterial } from './colony6-availability.ts'
import {
  estimateColony6Percent,
  estimateColony6Population,
  getAllColony6Levels,
  isImmigrantAvailable,
} from './colony6-levels.ts'
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
  const materials = items.filter((i) => i.category === 'colony_reconstruction')
  const immigrants = items.filter((i) => i.category === 'colony_immigrant')
  const levels = getAllColony6Levels(materials, progress)
  const percent = Math.max(
    gameState.colony6Reconstruction,
    estimateColony6Percent(levels),
  )
  const population = estimateColony6Population(immigrants, progress)
  const ids: string[] = []

  for (const item of items) {
    if (progress[item.id]?.completed) continue

    if (item.category === 'quest') {
      // Accepted-but-open quests stay actionable without NEW spam after first unlock
      if (progress[item.id]?.accepted) {
        ids.push(item.id)
        continue
      }
      const available = filterAvailableQuests(
        [item],
        items,
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
      // NEW only for materials that unlock the next section level
      if (isColony6NextLevelMaterial(item, levels, gameState)) {
        ids.push(item.id)
      }
      continue
    }

    if (item.category === 'colony_immigrant') {
      if (
        isImmigrantAvailable(
          item,
          levels,
          percent,
          population,
          immigrants,
          progress,
        )
      ) {
        ids.push(item.id)
      }
    }
  }

  return ids
}
