import { XC1_REGIONS, type GameState } from '../types/game-state.ts'
import type { TrackableItem } from '../types/tracker.ts'

function normalizeRegionName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function getCanonicalRegion(region?: string): string | undefined {
  if (!region) return undefined
  const normalized = normalizeRegionName(region)

  for (const { id } of XC1_REGIONS) {
    const canonical = normalizeRegionName(id)
    if (normalized.includes(canonical) || canonical.includes(normalized)) {
      return id
    }
  }

  return undefined
}

export function isRegionDiscovered(
  item: TrackableItem,
  gameState: GameState,
): boolean {
  const canonical = getCanonicalRegion(item.region)
  if (!canonical) return true
  return gameState.discoveredAreas[canonical] === true
}

export function filterByDiscoveredRegions<T extends TrackableItem>(
  items: T[],
  gameState: GameState,
): T[] {
  return items.filter((item) => isRegionDiscovered(item, gameState))
}
