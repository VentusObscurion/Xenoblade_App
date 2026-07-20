import type { GameState } from '../types/game-state.ts'
import {
  COLONY6_SECTIONS,
  type Colony6Section,
} from './colony6-levels.ts'
import { getCanonicalRegion } from './region-discovery.ts'
import type { TrackableItem } from '../types/tracker.ts'

export interface Colony6SourceRequirements {
  regions: string[]
  storyFlags: string[]
  /** Minimum Colony 6 reconstruction % (approx from level text). */
  minColony6Percent?: number
  /** True if Time Attack / Noponstone shop is listed (ignored for availability). */
  hasPurchaseFallback: boolean
}

const COLONY_LEVEL_PERCENT: Record<number, number> = {
  1: 0,
  2: 15,
  3: 35,
  4: 55,
  5: 75,
}

const STORY_PATTERNS: Array<{ pattern: RegExp; flag: string }> = [
  { pattern: /after\s+mechonis\s+core/i, flag: 'mechonis_core_cleared' },
  { pattern: /mechonis\s+core\s+cleared/i, flag: 'mechonis_core_cleared' },
]

/** Map free-text obtainedFrom into playthrough requirements. */
export function parseColony6ObtainedFrom(
  obtainedFrom: string | undefined,
): Colony6SourceRequirements {
  const text = obtainedFrom ?? ''
  // Ignore Noponstone / Time Attack purchase lines entirely
  const withoutPurchase = text
    .split(/,/)
    .filter((part) => !/Purchase:\s*Time\s*Attack|Noponstones?/i.test(part))
    .join(',')

  const regions = new Set<string>()
  const storyFlags = new Set<string>()
  let minColony6Percent: number | undefined

  const collectableMatches = withoutPurchase.matchAll(/Collectable:\s*([^,]+)/gi)
  for (const match of collectableMatches) {
    const chunk = match[1]
      .replace(/\s+or\s+Colony\s+6\s+Level\s+\d+\s+Special/i, '')
      .trim()
    const region =
      getCanonicalRegion(chunk) ?? getCanonicalRegion(chunk.split(/\s+or\s+/i)[0])
    if (region) regions.add(region)
  }

  // "X in/on Area", "Trade: Name (Area …)"
  const inOnMatches = withoutPurchase.matchAll(/\b(?:in|on)\s+([A-Z][^,()]+?)(?=,|\(|$)/g)
  for (const match of inOnMatches) {
    const region = getCanonicalRegion(match[1].trim())
    if (region) regions.add(region)
  }

  const tradeMatches = withoutPurchase.matchAll(/Trade:\s*[^,(]+(?:\(([^)]+)\))?/gi)
  for (const match of tradeMatches) {
    const paren = match[1]
    if (!paren) continue
    const areaPart = paren
      .split(/,/)[0]
      .replace(/\s*[☆★*].*$/, '')
      .replace(/\s*overtrade.*$/i, '')
      .replace(/\s*after\s+.+$/i, '')
      .trim()
    if (/refugee\s*camp/i.test(areaPart)) {
      regions.add('Colony 6')
      continue
    }
    const region = getCanonicalRegion(areaPart)
    if (region) regions.add(region)
  }

  for (const { pattern, flag } of STORY_PATTERNS) {
    if (pattern.test(withoutPurchase)) storyFlags.add(flag)
  }

  const levelMatch = withoutPurchase.match(/Colony\s+6\s+Level\s+(\d+)/i)
  if (levelMatch) {
    const level = Number(levelMatch[1])
    minColony6Percent = COLONY_LEVEL_PERCENT[level] ?? level * 15
  }

  const hasPurchaseFallback = /Purchase:\s*Time\s*Attack|Noponstones?/i.test(text)

  return {
    regions: [...regions],
    storyFlags: [...storyFlags],
    minColony6Percent,
    hasPurchaseFallback,
  }
}

export function isColony6MaterialAvailable(
  obtainedFrom: string | undefined,
  gameState: GameState,
): boolean {
  const req = parseColony6ObtainedFrom(obtainedFrom)

  for (const flag of req.storyFlags) {
    if (!gameState.storyFlags[flag]) return false
  }

  if (
    req.minColony6Percent !== undefined &&
    gameState.colony6Reconstruction < req.minColony6Percent
  ) {
    return false
  }

  // Purchase-only sources (Noponstones) are ignored — not considered available.
  if (req.regions.length === 0) {
    return !req.hasPurchaseFallback
  }

  return req.regions.some(
    (region) => gameState.discoveredAreas[region] === true,
  )
}

/**
 * True when this material is part of the next incomplete section level
 * (Housing/Commerce/Nature/Special) and its field sources are reachable.
 */
export function isColony6NextLevelMaterial(
  item: TrackableItem,
  levels: Record<Colony6Section, number>,
  gameState: GameState,
): boolean {
  const section = item.collectType as Colony6Section | undefined
  if (!section || !COLONY6_SECTIONS.includes(section)) return false
  const nextLevel = levels[section] + 1
  if (item.colonyLevel !== nextLevel) return false
  return isColony6MaterialAvailable(item.obtainedFrom, gameState)
}
