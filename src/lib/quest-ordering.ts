import type { GameState } from '../types/game-state.ts'
import type { ProgressEntry, TrackableItem } from '../types/tracker.ts'
import {
  getQuestDependencyIds,
  isItemAvailable,
  isQuestChainVisible,
} from './prerequisites.ts'

export interface QuestGroup {
  depth: number
  label: string
  items: TrackableItem[]
}

export function getQuestDepth(
  itemId: string,
  allQuests: TrackableItem[],
  cache = new Map<string, number>(),
  visiting = new Set<string>(),
): number {
  if (cache.has(itemId)) return cache.get(itemId)!

  if (visiting.has(itemId)) return 0
  visiting.add(itemId)

  const item = allQuests.find((q) => q.id === itemId)
  if (!item) {
    cache.set(itemId, 0)
    return 0
  }

  const deps = getQuestDependencyIds(item, allQuests)
  if (deps.length === 0) {
    cache.set(itemId, 0)
    return 0
  }

  const depth =
    1 + Math.max(...deps.map((id) => getQuestDepth(id, allQuests, cache, visiting)))
  cache.set(itemId, depth)
  return depth
}

export function groupQuestsByDepth(
  quests: TrackableItem[],
  allQuests: TrackableItem[],
): QuestGroup[] {
  const byDepth = new Map<number, TrackableItem[]>()

  for (const quest of quests) {
    const depth = getQuestDepth(quest.id, allQuests)
    const list = byDepth.get(depth) ?? []
    list.push(quest)
    byDepth.set(depth, list)
  }

  return [...byDepth.entries()]
    .sort(([a], [b]) => a - b)
    .map(([depth, items]) => ({
      depth,
      label: depthLabel(depth),
      items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
    }))
}

function depthLabel(depth: number): string {
  if (depth === 0) return 'No prior quests'
  if (depth === 1) return 'After 1 prior quest'
  return `After ${depth} prior quests`
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
