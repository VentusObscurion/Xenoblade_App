import { getPlaythroughConfig } from '../types/playthrough-config.ts'
import type { GameId } from '../types/tracker.ts'
import type { GameState } from '../types/game-state.ts'
import type { TrackableItem } from '../types/tracker.ts'
import { GAMES } from '../types/tracker.ts'

function normalizeRegionName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function allKnownRegions(): string[] {
  const ids = new Set<string>()
  for (const game of GAMES) {
    for (const region of getPlaythroughConfig(game.id).regions) {
      ids.add(region.id)
    }
  }
  return [...ids]
}

const KNOWN_REGIONS = allKnownRegions()

export function getCanonicalRegion(region?: string): string | undefined {
  if (!region) return undefined
  const normalized = normalizeRegionName(region)

  for (const id of KNOWN_REGIONS) {
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
  if (!canonical) return false
  return gameState.discoveredAreas[canonical] === true
}

export function isRegionIdDiscovered(
  region: string | undefined,
  gameState: GameState,
): boolean {
  if (!region) return false
  const canonical = getCanonicalRegion(region)
  if (!canonical) return false
  return gameState.discoveredAreas[canonical] === true
}

export function filterByDiscoveredRegions<T extends TrackableItem>(
  items: T[],
  gameState: GameState,
): T[] {
  return items.filter((item) => isRegionDiscovered(item, gameState))
}

export function getRegionSortOrder(gameId: GameId): Map<string, number> {
  return new Map(
    getPlaythroughConfig(gameId).regions.map((r, index) => [r.id, index]),
  )
}
