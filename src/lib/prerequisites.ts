import type { GameState } from '../types/game-state.ts'
import type {
  Prerequisite,
  PrerequisiteStatus,
  ProgressEntry,
  TrackableItem,
} from '../types/tracker.ts'
import {
  areH2HCharactersInParty,
  formatH2HAffinityRequirement,
  isH2HAffinityMet,
} from './h2h-availability.ts'
import { isRegionDiscovered } from './region-discovery.ts'
import { cleanWikiMarkup } from './wiki-text.ts'

function normalizeName(name: string): string {
  return cleanWikiMarkup(name)
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/\s+accepted$/i, '')
    .replace(/\s+completed$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function findQuestRefId(label: string, items: TrackableItem[]): string | undefined {
  const normalized = normalizeName(label)
  if (!normalized) return undefined

  const quest = items.find((item) => {
    if (item.category !== 'quest') return false
    const questName = normalizeName(item.name)
    return (
      questName === normalized ||
      normalized.includes(questName) ||
      questName.includes(normalized)
    )
  })
  return quest?.id
}

export function getQuestDependencyIds(
  item: TrackableItem,
  allQuests: TrackableItem[],
): string[] {
  const deps = new Set<string>()

  for (const prereq of item.prerequisites) {
    if (prereq.refId) {
      deps.add(prereq.refId)
      continue
    }

    if (prereq.type === 'quest') {
      const refId = findQuestRefId(prereq.label, allQuests)
      if (refId) deps.add(refId)
      continue
    }

    if (prereq.type === 'other') {
      const refId = findQuestRefId(prereq.label, allQuests)
      if (refId) deps.add(refId)
    }
  }

  return [...deps]
}

export function resolveQuestReferences(items: TrackableItem[]): TrackableItem[] {
  const questItems = items.filter((i) => i.category === 'quest')

  return items.map((item) => ({
    ...item,
    prerequisites: item.prerequisites.map((prereq) => {
      const refId =
        prereq.refId ??
        (prereq.type === 'quest' || prereq.type === 'other'
          ? findQuestRefId(prereq.label, questItems)
          : undefined)
      return refId ? { ...prereq, refId, type: 'quest' as const } : prereq
    }),
  }))
}

function isQuestPrerequisiteMet(
  prereq: Prerequisite,
  progress: Record<string, ProgressEntry>,
  items: TrackableItem[],
): boolean {
  if (prereq.refId) {
    return progress[prereq.refId]?.completed === true
  }
  const refId = findQuestRefId(prereq.label, items)
  if (refId) return progress[refId]?.completed === true
  return false
}

function parseRequiredLevel(item: TrackableItem): number | undefined {
  if (item.level) return item.level
  for (const prereq of item.prerequisites) {
    const match = prereq.label.match(/(?:level|lv\.?)\s*(\d+)/i)
    if (match) return parseInt(match[1], 10)
  }
  return undefined
}

function parseAffinityArea(label: string): string | undefined {
  const cleaned = cleanWikiMarkup(label)
  const match = cleaned.match(/^(.+?)\s+area\b/i)
  if (!match) return undefined
  return match[1].replace(/\s*\(XC1\)\s*$/i, '').trim()
}

function parseRequiredAffinityStars(label: string): number {
  const cleaned = cleanWikiMarkup(label)
  const halfMatch = cleaned.match(/[☆★]?\s*(\d)\s*½|(\d)\s*1\/2/i)
  if (halfMatch) {
    const whole = parseInt(halfMatch[1] ?? halfMatch[2], 10)
    return whole + 0.5
  }
  const starMatch = cleaned.match(/[☆★]?\s*(\d+)/)
  if (starMatch) return parseInt(starMatch[1], 10)
  const textMatch = cleaned.match(/(\d)[\s-]*star/i)
  return textMatch ? parseInt(textMatch[1], 10) : 1
}

function isLevelMet(item: TrackableItem, gameState: GameState): boolean {
  const required = parseRequiredLevel(item)
  if (!required) return true
  return gameState.playerLevel >= required
}

function isAffinityMet(prereq: Prerequisite, gameState: GameState): boolean {
  if (prereq.type !== 'affinity') return true
  const area = parseAffinityArea(prereq.label)
  if (!area) return true
  const required = parseRequiredAffinityStars(prereq.label)
  const current = gameState.areaAffinity[area] ?? 0
  return current >= required
}

export function isQuestChainVisible(
  item: TrackableItem,
  progress: Record<string, ProgressEntry>,
  allItems: TrackableItem[],
): boolean {
  const questDeps = getQuestDependencyIds(item, allItems)
  if (questDeps.length === 0) return true
  return questDeps.every((id) => progress[id]?.completed === true)
}

export function isItemAvailable(
  item: TrackableItem,
  progress: Record<string, ProgressEntry>,
  allItems: TrackableItem[],
  gameState: GameState,
): boolean {
  if (!isRegionDiscovered(item, gameState)) return false
  if (!isQuestChainVisible(item, progress, allItems)) return false
  if (!isLevelMet(item, gameState)) return false

  for (const prereq of item.prerequisites) {
    if (prereq.type === 'quest' || prereq.refId) {
      if (!isQuestPrerequisiteMet(prereq, progress, allItems)) return false
    }
    if (prereq.type === 'affinity' && !isAffinityMet(prereq, gameState)) {
      return false
    }
  }

  return true
}

export function evaluatePrerequisites(
  item: TrackableItem,
  progress: Record<string, ProgressEntry>,
  allItems: TrackableItem[],
  gameState?: GameState,
): { status: PrerequisiteStatus; unmet: Prerequisite[] } {
  const unmet: Prerequisite[] = []

  const questDeps = item.prerequisites.filter(
    (p) => p.type === 'quest' || p.refId || findQuestRefId(p.label, allItems),
  )
  for (const prereq of questDeps) {
    if (!isQuestPrerequisiteMet(prereq, progress, allItems)) {
      unmet.push(prereq)
    }
  }

  if (gameState) {
    if (!isRegionDiscovered(item, gameState)) {
      unmet.push({
        type: 'area',
        label: `${item.region ?? 'Area'} not yet discovered`,
      })
    }
    if (!isLevelMet(item, gameState)) {
      const required = parseRequiredLevel(item)
      if (required) {
        unmet.push({ type: 'level', label: `Level ${required}` })
      }
    }

    if (item.category === 'heart_to_heart') {
      const chars = item.characters ?? []
      if (chars.length >= 2 && !areH2HCharactersInParty(item, gameState)) {
        unmet.push({
          type: 'other',
          label: `Requires ${chars.join(' and ')} in party`,
        })
      }
      if (item.affinityLevel && item.affinityLevel > 0 && !isH2HAffinityMet(item, gameState)) {
        unmet.push({
          type: 'affinity',
          label: formatH2HAffinityRequirement(item.affinityLevel),
        })
      }
    } else {
      for (const prereq of item.prerequisites) {
        if (prereq.type === 'affinity' && !isAffinityMet(prereq, gameState)) {
          unmet.push(prereq)
        }
      }
    }
  }

  let checkable = questDeps.length
  if (gameState) {
    checkable += 1
    if (item.category === 'heart_to_heart') {
      if ((item.characters?.length ?? 0) >= 2) checkable += 1
      if (item.affinityLevel && item.affinityLevel > 0) checkable += 1
    }
  }
  if (checkable === 0 && unmet.length === 0) {
    return { status: 'unknown', unmet: [] }
  }
  if (unmet.length === 0) return { status: 'fulfilled', unmet: [] }

  const questUnmet = unmet.filter((p) => p.type === 'quest' || p.refId)
  if (questUnmet.length > 0 && questUnmet.length < questDeps.length) {
    return { status: 'partial', unmet }
  }
  if (unmet.length < checkable) return { status: 'partial', unmet }
  return { status: 'blocked', unmet }
}

export function getPrerequisiteStatusLabel(status: PrerequisiteStatus): string {
  switch (status) {
    case 'fulfilled':
      return 'Available'
    case 'partial':
      return 'Partial'
    case 'blocked':
      return 'Blocked'
    default:
      return 'Unknown'
  }
}

export function getPrerequisiteStatusColor(status: PrerequisiteStatus): string {
  switch (status) {
    case 'fulfilled':
      return 'var(--status-fulfilled)'
    case 'partial':
      return 'var(--status-partial)'
    case 'blocked':
      return 'var(--status-blocked)'
    default:
      return 'var(--status-unknown)'
  }
}
