import type { GameState } from '../types/game-state.ts'
import type { ProgressEntry, TrackableItem } from '../types/tracker.ts'
import {
  getQuestDependencyIds,
  isItemAvailable,
  isQuestChainVisible,
} from './prerequisites.ts'
import { getCanonicalRegion } from './region-discovery.ts'
import { XC1_REGIONS } from '../types/game-state.ts'

export interface QuestGroup {
  depth: number
  label: string
  items: TrackableItem[]
}

export function groupQuestsByRegion(quests: TrackableItem[]): QuestGroup[] {
  const byRegion = new Map<string, TrackableItem[]>()

  for (const quest of quests) {
    const region = getCanonicalRegion(quest.region) ?? quest.region ?? 'Unknown'
    const list = byRegion.get(region) ?? []
    list.push(quest)
    byRegion.set(region, list)
  }

  const order = new Map(XC1_REGIONS.map((r, index) => [r.id, index]))

  return [...byRegion.entries()]
    .sort(([a], [b]) => {
      const indexA = order.get(a)
      const indexB = order.get(b)
      if (indexA !== undefined && indexB !== undefined) return indexA - indexB
      if (indexA !== undefined) return -1
      if (indexB !== undefined) return 1
      return a.localeCompare(b)
    })
    .map(([label, items], index) => ({
      depth: index,
      label,
      items: [...items].sort((a, b) => {
        const levelA = a.level ?? 0
        const levelB = b.level ?? 0
        if (levelA !== levelB) return levelA - levelB
        return a.name.localeCompare(b.name)
      }),
    }))
}

/** @deprecated Prefer groupQuestsByRegion */
export function groupQuestsByDepth(
  quests: TrackableItem[],
  allQuests: TrackableItem[],
): QuestGroup[] {
  const byDepth = new Map<number, TrackableItem[]>()

  for (const quest of quests) {
    const deps = getQuestDependencyIds(quest, allQuests)
    const depth = deps.length === 0 ? 0 : 1
    const list = byDepth.get(depth) ?? []
    list.push(quest)
    byDepth.set(depth, list)
  }

  return [...byDepth.entries()]
    .sort(([a], [b]) => a - b)
    .map(([depth, items]) => ({
      depth,
      label: depth === 0 ? 'No prior quests' : 'Has prior quests',
      items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
    }))
}

export function filterVisibleQuests(
  quests: TrackableItem[],
  allQuests: TrackableItem[],
  progress: Record<string, ProgressEntry>,
  hideUntilPrereqDone: boolean,
): TrackableItem[] {
  if (!hideUntilPrereqDone) return quests
  return quests.filter((q) => isQuestChainVisible(q, progress, allQuests))
}

export function filterAvailableQuests(
  quests: TrackableItem[],
  allQuests: TrackableItem[],
  progress: Record<string, ProgressEntry>,
  gameState: GameState,
): TrackableItem[] {
  return quests.filter((q) => isItemAvailable(q, progress, allQuests, gameState))
}
