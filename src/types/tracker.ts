export type GameId =
  | 'xc1'
  | 'xc1-fc'
  | 'xc2'
  | 'xc2-torna'
  | 'xc3'
  | 'xc3-fr'
  | 'xcx'

export type Category =
  | 'quest'
  | 'unique_monster'
  | 'achievement'
  | 'heart_to_heart'
  | 'quiet_moment'
  | 'item'
  | 'collectopaedia'
  | 'landmark'
  | 'colony_reconstruction'
  | 'colony_immigrant'
  | 'person'
  | 'blade'
  | 'hero'
  | 'merc_mission'

export type PrerequisiteType =
  | 'level'
  | 'area'
  | 'affinity'
  | 'quest'
  | 'story_flag'
  | 'time'
  | 'other'

export interface Prerequisite {
  type: PrerequisiteType
  label: string
  refId?: string
}

export interface H2HOutcome {
  title: string
  choices: string[]
  dialogue: string
}

export interface TrackableItem {
  id: string
  gameId: GameId
  category: Category
  name: string
  region?: string
  level?: number
  prerequisites: Prerequisite[]
  rewards?: string[]
  description?: string
  walkthrough?: string
  wikiUrl: string
  wikiPageId?: number
  /** Thumbnail / portrait URL from the wiki (detail panel). */
  imageUrl?: string
  // Quest details
  giver?: string
  subLocation?: string
  timeWindow?: string
  questType?: string
  /** Story-timed quest that can expire / become unavailable later. */
  timed?: boolean
  uniqueComments?: string
  results?: string
  trivia?: string
  // Unique monster details
  spawnTime?: string
  respawn?: string
  expReward?: number
  apReward?: number
  drops?: string[]
  // Heart-to-heart details
  characters?: string[]
  affinityLevel?: number
  timeOfDay?: string
  affinityEffects?: string
  h2hIntro?: string
  h2hOutcomes?: H2HOutcome[]
  // Item details
  itemLocations?: string[]
  itemHasTrade?: boolean
  itemTradeInfo?: string[]
  itemGifting?: string
  itemQuestUses?: string[]
  // Collectopaedia details
  collectType?: string
  rarity?: string
  quantity?: string
  collectopaediaSlots?: (string | null)[]
  // Colony 6 reconstruction
  colonyLevel?: number
  colonyGold?: string
  obtainedFrom?: string
  // Blade / Hero extras
  element?: string
  weaponClass?: string
  role?: string
}

export interface ProgressEntry {
  itemId: string
  /** Quest accepted / immigrant invited / etc. */
  accepted?: boolean
  completed: boolean
  completedAt?: string
  notes?: string
}

export type PrerequisiteStatus = 'fulfilled' | 'partial' | 'blocked' | 'unknown'

export interface ItemWithStatus extends TrackableItem {
  completed: boolean
  prerequisiteStatus: PrerequisiteStatus
  unmetPrerequisites: Prerequisite[]
}

export interface DataManifest {
  version: string
  generatedAt: string
  attribution: string
  wikiBaseUrl: string
  games: Partial<
    Record<
      GameId,
      {
        name: string
        categories: Partial<Record<Category, number>>
      }
    >
  >
}

export interface GameInfo {
  id: GameId
  name: string
  available: boolean
}

export const GAMES: GameInfo[] = [
  { id: 'xc1', name: 'Xenoblade Chronicles', available: true },
  { id: 'xc1-fc', name: 'Future Connected', available: true },
  { id: 'xc2', name: 'Xenoblade Chronicles 2', available: true },
  { id: 'xc2-torna', name: 'Torna ~ The Golden Country', available: true },
  { id: 'xc3', name: 'Xenoblade Chronicles 3', available: true },
  { id: 'xc3-fr', name: 'Future Redeemed', available: true },
  { id: 'xcx', name: 'Xenoblade Chronicles X', available: false },
]

export const CATEGORY_LABELS: Record<Category, string> = {
  quest: 'Quests',
  unique_monster: 'Unique Monsters',
  achievement: 'Achievements',
  heart_to_heart: 'Heart-to-Hearts',
  quiet_moment: 'Quiet Moments',
  item: 'Items',
  collectopaedia: 'Collectopaedia',
  landmark: 'Landmarks',
  colony_reconstruction: 'Colony 6 Reconstruction',
  colony_immigrant: 'Colony 6 Immigrants',
  person: 'Persons',
  blade: 'Blades',
  hero: 'Heroes',
  merc_mission: 'Merc Missions',
}

export const GAME_CATEGORIES: Record<GameId, Category[]> = {
  xc1: [
    'quest',
    'unique_monster',
    'heart_to_heart',
    'person',
    'collectopaedia',
    'colony_reconstruction',
  ],
  'xc1-fc': ['quest', 'unique_monster', 'quiet_moment'],
  xc2: [
    'quest',
    'unique_monster',
    'heart_to_heart',
    'blade',
    'collectopaedia',
  ],
  'xc2-torna': ['quest', 'unique_monster', 'collectopaedia'],
  xc3: ['quest', 'unique_monster', 'hero', 'collectopaedia'],
  'xc3-fr': ['quest', 'unique_monster', 'collectopaedia'],
  xcx: [],
}
