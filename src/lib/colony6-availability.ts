import type { GameState } from '../types/game-state.ts'
import { getCanonicalRegion } from './region-discovery.ts'

export interface Colony6SourceRequirements {
  regions: string[]
  storyFlags: string[]
  /** Minimum Colony 6 reconstruction % (approx from level text). */
  minColony6Percent?: number
  /** True if Time Attack / shop purchase is an alternative source. */
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
  const regions = new Set<string>()
  const storyFlags = new Set<string>()
  let minColony6Percent: number | undefined

  const collectableMatches = text.matchAll(/Collectable:\s*([^,]+)/gi)
  for (const match of collectableMatches) {
    const chunk = match[1]
      .replace(/\s+or\s+Colony\s+6\s+Level\s+\d+\s+Special/i, '')
      .trim()
    const region = getCanonicalRegion(chunk) ?? getCanonicalRegion(chunk.split(/\s+or\s+/i)[0])
    if (region) regions.add(region)
  }

  // "X in/on Area", "Trade: Name (Area …)"
  const inOnMatches = text.matchAll(/\b(?:in|on)\s+([A-Z][^,()]+?)(?=,|\(|$)/g)
  for (const match of inOnMatches) {
    const region = getCanonicalRegion(match[1].trim())
    if (region) regions.add(region)
  }

  const tradeMatches = text.matchAll(/Trade:\s*[^,(]+(?:\(([^)]+)\))?/gi)
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
    if (pattern.test(text)) storyFlags.add(flag)
  }

  const levelMatch = text.match(/Colony\s+6\s+Level\s+(\d+)/i)
  if (levelMatch) {
    const level = Number(levelMatch[1])
    minColony6Percent = COLONY_LEVEL_PERCENT[level] ?? level * 15
  }

  const hasPurchaseFallback = /Purchase:\s*Time\s*Attack/i.test(text)

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

  // DE Time Attack is always an alternative once you can access it;
  // treat as available so materials aren't permanently blocked.
  if (req.hasPurchaseFallback) return true

  for (const flag of req.storyFlags) {
    if (!gameState.storyFlags[flag]) return false
  }

  if (
    req.minColony6Percent !== undefined &&
    gameState.colony6Reconstruction < req.minColony6Percent
  ) {
    return false
  }

  if (req.regions.length === 0) return true

  return req.regions.some(
    (region) => gameState.discoveredAreas[region] === true,
  )
}
