export const XC1_CHARACTERS = [
  'Shulk',
  'Reyn',
  'Sharla',
  'Dunban',
  'Melia',
  'Riki',
  'Fiora',
] as const

export type XC1Character = (typeof XC1_CHARACTERS)[number]

/** The five Affinity Chart regions in XC1 (separate from map discovery). */
export const XC1_AFFINITY_REGIONS = [
  'Colony 9',
  'Colony 6',
  'Central Bionis',
  'Upper Bionis',
  'Hidden Village',
] as const

export type XC1AffinityRegion = (typeof XC1_AFFINITY_REGIONS)[number]

export interface StoryFlagDef {
  id: string
  label: string
  description?: string
}

/** Important story / playthrough flags used by many quest prerequisites. */
export const XC1_STORY_FLAGS: StoryFlagDef[] = [
  {
    id: 'mechon_attack_colony9',
    label: 'Mechon attack on Colony 9',
    description: 'After the Mechon raid / attack in Colony 9',
  },
  {
    id: 'attack_on_colony6',
    label: 'Attack on Colony 6',
    description: 'After the attack on Colony 6 / Refugee Camp era',
  },
  {
    id: 'juju_escorted',
    label: 'Juju escorted to Refugee Camp',
  },
  {
    id: 'melia_met',
    label: 'Melia met in Makna Forest',
  },
  {
    id: 'colony6_reconstruction_started',
    label: 'Colony 6 Reconstruction started',
  },
  {
    id: 'miqol_met',
    label: 'Met Miqol in Hidden Machina Village',
  },
  {
    id: 'mechonis_core_cleared',
    label: 'Mechonis Core cleared',
    description: 'After clearing Mechonis Core (late-game Alcamoth return, etc.)',
  },
  {
    id: 'heading_high_entia_tomb',
    label: 'Heading to the High Entia Tomb',
  },
  {
    id: 'course_to_prison_island',
    label: 'In the course to Prison Island',
  },
]

export interface GameState {
  playerLevel: number
  /** Affinity Chart stars for the 5 affinity regions only. */
  areaAffinity: Record<string, number>
  discoveredAreas: Record<string, boolean>
  partyMembers: string[]
  /** Active party leader for “X in the lead” quest requirements. */
  partyLeader: string
  characterAffinity: Record<string, number>
  storyFlags: Record<string, boolean>
  /** Colony 6 reconstruction progress 0–100. */
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

export interface DiscoverableRegion {
  id: string
  defaultDiscovered?: boolean
}

export const XC1_REGIONS: DiscoverableRegion[] = [
  { id: 'Colony 9', defaultDiscovered: true },
  { id: 'Tephra Cave' },
  { id: "Bionis' Leg" },
  { id: 'Colony 6' },
  { id: 'Satorl Marsh' },
  { id: "Bionis' Interior" },
  { id: 'Makna Forest' },
  { id: 'Frontier Village' },
  { id: 'Eryth Sea' },
  { id: 'Alcamoth' },
  { id: 'Valak Mountain' },
  { id: 'Sword Valley' },
  { id: 'Galahad Fortress' },
  { id: 'Fallen Arm' },
  { id: 'Mechonis Field' },
  { id: 'Prison Island' },
  { id: "Bionis' Shoulder" },
  { id: 'Hidden Village' },
]

export const DEFAULT_DISCOVERED_AREAS: Record<string, boolean> = Object.fromEntries(
  XC1_REGIONS.map((r) => [r.id, r.defaultDiscovered ?? false]),
)

export const DEFAULT_STORY_FLAGS: Record<string, boolean> = Object.fromEntries(
  XC1_STORY_FLAGS.map((f) => [f.id, false]),
)

export const DEFAULT_GAME_STATE: GameState = {
  playerLevel: 1,
  areaAffinity: {},
  discoveredAreas: { ...DEFAULT_DISCOVERED_AREAS },
  partyMembers: ['Shulk', 'Reyn'],
  partyLeader: 'Shulk',
  characterAffinity: {},
  storyFlags: { ...DEFAULT_STORY_FLAGS },
  colony6Reconstruction: 0,
}

export function normalizeGameState(stored: Partial<GameState> | undefined): GameState {
  const partyMembers = stored?.partyMembers ?? DEFAULT_GAME_STATE.partyMembers
  const partyLeader =
    stored?.partyLeader && partyMembers.includes(stored.partyLeader)
      ? stored.partyLeader
      : partyMembers[0] ?? 'Shulk'

  // Migrate old per-area affinity keys into the 5 chart regions where possible.
  const rawAffinity = { ...stored?.areaAffinity }
  const areaAffinity: Record<string, number> = {}
  for (const region of XC1_AFFINITY_REGIONS) {
    areaAffinity[region] = rawAffinity?.[region] ?? 0
  }
  if (rawAffinity) {
    if ((rawAffinity['Frontier Village'] ?? 0) > areaAffinity['Central Bionis']) {
      areaAffinity['Central Bionis'] = rawAffinity['Frontier Village']
    }
    if ((rawAffinity['Alcamoth'] ?? 0) > areaAffinity['Upper Bionis']) {
      areaAffinity['Upper Bionis'] = rawAffinity['Alcamoth']
    }
  }

  return {
    ...DEFAULT_GAME_STATE,
    ...stored,
    areaAffinity,
    discoveredAreas: {
      ...DEFAULT_DISCOVERED_AREAS,
      ...stored?.discoveredAreas,
    },
    partyMembers,
    partyLeader,
    characterAffinity: {
      ...DEFAULT_GAME_STATE.characterAffinity,
      ...stored?.characterAffinity,
    },
    storyFlags: {
      ...DEFAULT_STORY_FLAGS,
      ...stored?.storyFlags,
    },
    colony6Reconstruction: Math.max(
      0,
      Math.min(100, stored?.colony6Reconstruction ?? 0),
    ),
  }
}
