export interface GameState {
  playerLevel: number
  areaAffinity: Record<string, number>
  discoveredAreas: Record<string, boolean>
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
  { id: 'Hidden Village', hasAffinity: true },
]

export const DEFAULT_DISCOVERED_AREAS: Record<string, boolean> = Object.fromEntries(
  XC1_REGIONS.map((r) => [r.id, r.defaultDiscovered ?? false]),
)

export const DEFAULT_GAME_STATE: GameState = {
  playerLevel: 1,
  areaAffinity: {},
  discoveredAreas: { ...DEFAULT_DISCOVERED_AREAS },
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
  }
}
