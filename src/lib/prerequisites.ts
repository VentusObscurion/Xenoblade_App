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
import {
  extractQuestNameFromLabel,
  isAreaAffinityMet,
  isColony6InviteRequirement,
  isIgnorablePrerequisite,
  isQuestProgressLabel,
  isStoryFlagMet,
  matchStoryFlag,
  parsePartyLeadRequirement,
  parsePartyMemberRequirement,
  resolveAccessRegion,
} from './quest-prereq-parse.ts'
import { getCanonicalRegion, isRegionDiscovered } from './region-discovery.ts'
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

/**
 * Resolve a prerequisite label to a quest id.
 * Only exact / near-exact matches — no loose substring matching.
 */
export function findQuestRefId(label: string, items: TrackableItem[]): string | undefined {
  const extracted = extractQuestNameFromLabel(label)
  const normalized = normalizeName(extracted)
  if (!normalized || normalized.length < 3) return undefined

  const questItems = items.filter((item) => item.category === 'quest')

  const exact = questItems.find((item) => normalizeName(item.name) === normalized)
  if (exact) return exact.id

  // Allow wiki quotes / trailing punctuation differences
  const soft = questItems.find((item) => {
    const questName = normalizeName(item.name)
    return (
      questName === normalized.replace(/\?+$/, '') ||
      normalized.replace(/\?+$/, '') === questName
    )
  })
  return soft?.id
}

function isLikelyQuestPrerequisite(prereq: Prerequisite): boolean {
  if (prereq.refId || prereq.type === 'quest') return true
  if (isIgnorablePrerequisite(prereq.label)) return false
  if (isColony6InviteRequirement(prereq.label)) return false
  if (parsePartyMemberRequirement(prereq.label)) return false
  if (parsePartyLeadRequirement(prereq.label)) return false
  if (matchStoryFlag(prereq.label)) return false
  if (resolveAccessRegion(prereq.label) && /reached|access to|arrived/i.test(prereq.label)) {
    return false
  }
  if (prereq.type === 'other' && isQuestProgressLabel(prereq.label)) return true
  if (prereq.type === 'other') {
    // Bare quest name without accepted/completed — only if exact match exists
    return false
  }
  return false
}

export function getQuestDependencyIds(
  item: TrackableItem,
  allQuests: TrackableItem[],
): string[] {
  const deps = new Set<string>()

  for (const prereq of item.prerequisites) {
    if (isIgnorablePrerequisite(prereq.label)) continue

    if (prereq.refId) {
      deps.add(prereq.refId)
      continue
    }

    if (prereq.type === 'quest' || isQuestProgressLabel(prereq.label)) {
      const refId = findQuestRefId(prereq.label, allQuests)
      if (refId) deps.add(refId)
      continue
    }

    // Bare other labels that exactly match a quest name
    if (prereq.type === 'other' && !isColony6InviteRequirement(prereq.label)) {
      const extracted = extractQuestNameFromLabel(prereq.label)
      const normalized = normalizeName(extracted)
      const exact = allQuests.find(
        (q) => q.category === 'quest' && normalizeName(q.name) === normalized,
      )
      if (exact && normalized.length >= 4) deps.add(exact.id)
    }
  }

  return [...deps]
}

export function resolveQuestReferences(items: TrackableItem[]): TrackableItem[] {
  const questItems = items.filter((i) => i.category === 'quest')

  return items.map((item) => ({
    ...item,
    prerequisites: item.prerequisites
      .filter((prereq) => !isIgnorablePrerequisite(prereq.label))
      .map((prereq) => {
        if (prereq.refId) return prereq

        const shouldResolve =
          prereq.type === 'quest' ||
          isQuestProgressLabel(prereq.label) ||
          (prereq.type === 'other' &&
            !isColony6InviteRequirement(prereq.label) &&
            !parsePartyMemberRequirement(prereq.label) &&
            !parsePartyLeadRequirement(prereq.label))

        if (!shouldResolve) return prereq

        const refId = findQuestRefId(prereq.label, questItems)
        if (!refId) return prereq

        // Only promote to quest type when it's clearly a quest progress label
        // or an exact bare quest name
        const exactBare =
          normalizeName(extractQuestNameFromLabel(prereq.label)) ===
          normalizeName(questItems.find((q) => q.id === refId)?.name ?? '')

        if (prereq.type === 'quest' || isQuestProgressLabel(prereq.label) || exactBare) {
          return { ...prereq, refId, type: 'quest' as const }
        }
        return prereq
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

function isLevelMet(item: TrackableItem, gameState: GameState): boolean {
  const required = parseRequiredLevel(item)
  if (!required) return true
  return gameState.playerLevel >= required
}

function evaluateOtherPrerequisite(
  prereq: Prerequisite,
  gameState: GameState,
): { met: boolean; tracked: boolean; label?: string } {
  if (isIgnorablePrerequisite(prereq.label)) {
    return { met: true, tracked: true }
  }

  const partyMember = parsePartyMemberRequirement(prereq.label)
  if (partyMember) {
    return {
      met: gameState.partyMembers.includes(partyMember),
      tracked: true,
      label: `${partyMember} in party`,
    }
  }

  const partyLead = parsePartyLeadRequirement(prereq.label)
  if (partyLead) {
    return {
      met: gameState.partyLeader === partyLead,
      tracked: true,
      label: `${partyLead} in the lead`,
    }
  }

  const storyMet = isStoryFlagMet(prereq.label, gameState)
  if (storyMet !== undefined) {
    return { met: storyMet, tracked: true }
  }

  const accessRegion = resolveAccessRegion(prereq.label)
  if (
    accessRegion &&
    (/reached|access to|arrived|area reached/i.test(prereq.label) ||
      prereq.type === 'area')
  ) {
    return {
      met: gameState.discoveredAreas[accessRegion] === true,
      tracked: true,
      label: `${accessRegion} discovered`,
    }
  }

  if (isColony6InviteRequirement(prereq.label)) {
    // Tracked only loosely via reconstruction started for now
    return {
      met:
        gameState.storyFlags.colony6_reconstruction_started === true ||
        gameState.colony6Reconstruction > 0,
      tracked: true,
      label: prereq.label,
    }
  }

  return { met: true, tracked: false }
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
    if (isIgnorablePrerequisite(prereq.label)) continue

    if (prereq.type === 'quest' || prereq.refId) {
      if (!isQuestPrerequisiteMet(prereq, progress, allItems)) return false
      continue
    }

    if (prereq.type === 'affinity') {
      if (!isAreaAffinityMet(prereq.label, gameState)) return false
      continue
    }

    if (prereq.type === 'area') {
      const region = resolveAccessRegion(prereq.label) ?? getCanonicalRegion(prereq.label)
      if (region && gameState.discoveredAreas[region] !== true) return false
      continue
    }

    if (prereq.type === 'other' || prereq.type === 'story_flag') {
      if (isQuestProgressLabel(prereq.label)) {
        if (!isQuestPrerequisiteMet(prereq, progress, allItems)) return false
        continue
      }
      const result = evaluateOtherPrerequisite(prereq, gameState)
      if (result.tracked && !result.met) return false
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

  const questDeps = item.prerequisites.filter((p) => {
    if (isIgnorablePrerequisite(p.label)) return false
    if (p.type === 'quest' || p.refId) return true
    if (isQuestProgressLabel(p.label)) return true
    if (p.type === 'other') {
      const name = normalizeName(extractQuestNameFromLabel(p.label))
      return allItems.some(
        (q) => q.category === 'quest' && normalizeName(q.name) === name && name.length >= 4,
      )
    }
    return false
  })

  for (const prereq of questDeps) {
    if (!isQuestPrerequisiteMet(prereq, progress, allItems)) {
      unmet.push(prereq)
    }
  }

  if (gameState) {
    if (!isRegionDiscovered(item, gameState)) {
      unmet.push({
        type: 'area',
        label: `${getCanonicalRegion(item.region) ?? item.region ?? 'Area'} not yet discovered`,
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
        if (isIgnorablePrerequisite(prereq.label)) continue

        if (prereq.type === 'affinity' && !isAreaAffinityMet(prereq.label, gameState)) {
          unmet.push(prereq)
          continue
        }

        if (prereq.type === 'area') {
          const region =
            resolveAccessRegion(prereq.label) ?? getCanonicalRegion(prereq.label)
          if (region && gameState.discoveredAreas[region] !== true) {
            unmet.push({ type: 'area', label: `${region} discovered` })
          }
          continue
        }

        if (prereq.type === 'other' || prereq.type === 'story_flag') {
          if (isLikelyQuestPrerequisite(prereq)) continue
          const result = evaluateOtherPrerequisite(prereq, gameState)
          if (result.tracked && !result.met) {
            unmet.push({
              type: prereq.type,
              label: result.label ?? prereq.label,
            })
          }
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
