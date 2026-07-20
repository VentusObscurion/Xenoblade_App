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

export interface GameState {
  playerLevel: number
  areaAffinity: Record<string, number>
  discoveredAreas: Record<string, boolean>
  partyMembers: string[]
  characterAffinity: Record<string, number>
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
  hasAffinity: boolean
  defaultDiscovered?: boolean
}

export const XC1_REGIONS: DiscoverableRegion[] = [
  { id: 'Colony 9', hasAffinity: true, defaultDiscovered: true },
  { id: 'Tephra Cave', hasAffinity: false },
  { id: "Bionis' Leg", hasAffinity: false },
  { id: 'Colony 6', hasAffinity: true },
  { id: 'Satorl Marsh', hasAffinity: false },
  { id: "Bionis' Interior", hasAffinity: false },
  { id: 'Makna Forest', hasAffinity: false },
  { id: 'Frontier Village', hasAffinity: true },
  { id: 'Eryth Sea', hasAffinity: false },
  { id: 'Alcamoth', hasAffinity: true },
  { id: 'Valak Mountain', hasAffinity: false },
  { id: 'Sword Valley', hasAffinity: false },
  { id: 'Galahad Fortress', hasAffinity: false },
  { id: 'Fallen Arm', hasAffinity: false },
  { id: 'Mechonis Field', hasAffinity: false },
  { id: 'Prison Island', hasAffinity: false },
  { id: "Bionis' Shoulder", hasAffinity: false },
  { id: 'Hidden Village', hasAffinity: true },
]

export const DEFAULT_DISCOVERED_AREAS: Record<string, boolean> = Object.fromEntries(
  XC1_REGIONS.map((r) => [r.id, r.defaultDiscovered ?? false]),
)

export const DEFAULT_GAME_STATE: GameState = {
  playerLevel: 1,
  areaAffinity: {},
  discoveredAreas: { ...DEFAULT_DISCOVERED_AREAS },
  partyMembers: ['Shulk', 'Reyn'],
  characterAffinity: {},
}

export function normalizeGameState(stored: Partial<GameState> | undefined): GameState {
  return {
    ...DEFAULT_GAME_STATE,
    ...stored,
    areaAffinity: { ...DEFAULT_GAME_STATE.areaAffinity, ...stored?.areaAffinity },
    discoveredAreas: {
      ...DEFAULT_DISCOVERED_AREAS,
      ...stored?.discoveredAreas,
    },
    partyMembers: stored?.partyMembers ?? DEFAULT_GAME_STATE.partyMembers,
    characterAffinity: {
      ...DEFAULT_GAME_STATE.characterAffinity,
      ...stored?.characterAffinity,
    },
  }
}
