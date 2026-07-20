import type { StoryFlagDef } from './playthrough-config.ts'
import { getPlaythroughConfig } from './playthrough-config.ts'
import type { GameId } from './tracker.ts'

export type { StoryFlagDef }

/** @deprecated Use getPlaythroughConfig('xc1') */
export const XC1_CHARACTERS = getPlaythroughConfig('xc1').characters

/** @deprecated */
export const XC1_AFFINITY_REGIONS = getPlaythroughConfig('xc1').affinityCharts

/** @deprecated */
export const XC1_STORY_FLAGS = getPlaythroughConfig('xc1').storyFlags

/** @deprecated */
export const XC1_REGIONS = getPlaythroughConfig('xc1').regions

export interface GameState {
  playerLevel: number
  /** Affinity chart values (XC1 areas / XC2 titans / XC3 colonies). */
  areaAffinity: Record<string, number>
  discoveredAreas: Record<string, boolean>
  partyMembers: string[]
  partyLeader: string
  characterAffinity: Record<string, number>
  storyFlags: Record<string, boolean>
  /** Colony 6 reconstruction progress 0–100 (XC1). */
  colony6Reconstruction: number
}

export function characterPairKey(a: string, b: string): string {
  return [a, b].sort().join(' / ')
}

export function getCharacterPairs(members: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = []
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      pairs.push([members[i], members[j]])
    }
  }
  return pairs
}

export function createDefaultGameState(gameId: GameId = 'xc1'): GameState {
  const config = getPlaythroughConfig(gameId)
  const discoveredAreas = Object.fromEntries(
    config.regions.map((r) => [r.id, r.defaultDiscovered ?? false]),
  )
  const areaAffinity = Object.fromEntries(
    config.affinityCharts.map((name) => [name, 0]),
  )
  const storyFlags = Object.fromEntries(
    config.storyFlags.map((f) => [f.id, false]),
  )
  const partyMembers = [...config.characters].slice(0, Math.min(2, config.characters.length))

  return {
    playerLevel: 1,
    areaAffinity,
    discoveredAreas,
    partyMembers,
    partyLeader: partyMembers[0] ?? config.characters[0] ?? '',
    characterAffinity: {},
    storyFlags,
    colony6Reconstruction: 0,
  }
}

export const DEFAULT_GAME_STATE: GameState = createDefaultGameState('xc1')

export const DEFAULT_DISCOVERED_AREAS: Record<string, boolean> =
  DEFAULT_GAME_STATE.discoveredAreas

export const DEFAULT_STORY_FLAGS: Record<string, boolean> =
  DEFAULT_GAME_STATE.storyFlags

export function normalizeGameState(
  stored: Partial<GameState> | undefined,
  gameId: GameId = 'xc1',
): GameState {
  const defaults = createDefaultGameState(gameId)
  const config = getPlaythroughConfig(gameId)

  const partyMembers =
    stored?.partyMembers && stored.partyMembers.length > 0
      ? stored.partyMembers
      : defaults.partyMembers
  const partyLeader =
    stored?.partyLeader && partyMembers.includes(stored.partyLeader)
      ? stored.partyLeader
      : partyMembers[0] ?? defaults.partyLeader

  const rawAffinity = { ...stored?.areaAffinity }
  const areaAffinity: Record<string, number> = { ...defaults.areaAffinity }
  for (const chart of config.affinityCharts) {
    areaAffinity[chart] = rawAffinity?.[chart] ?? 0
  }

  // Legacy XC1 migration: Frontier Village → Central Bionis, Alcamoth → Upper Bionis
  if (gameId === 'xc1' && rawAffinity) {
    if ((rawAffinity['Frontier Village'] ?? 0) > (areaAffinity['Central Bionis'] ?? 0)) {
      areaAffinity['Central Bionis'] = rawAffinity['Frontier Village']
    }
    if ((rawAffinity['Alcamoth'] ?? 0) > (areaAffinity['Upper Bionis'] ?? 0)) {
      areaAffinity['Upper Bionis'] = rawAffinity['Alcamoth']
    }
  }

  return {
    ...defaults,
    ...stored,
    areaAffinity,
    discoveredAreas: {
      ...defaults.discoveredAreas,
      ...stored?.discoveredAreas,
    },
    partyMembers,
    partyLeader,
    characterAffinity: {
      ...defaults.characterAffinity,
      ...stored?.characterAffinity,
    },
    storyFlags: {
      ...defaults.storyFlags,
      ...stored?.storyFlags,
    },
    colony6Reconstruction: Math.max(
      0,
      Math.min(100, stored?.colony6Reconstruction ?? 0),
    ),
  }
}
