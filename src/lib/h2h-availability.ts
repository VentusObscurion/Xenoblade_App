import {
  characterPairKey,
  type GameState,
} from '../types/game-state.ts'
import type { ProgressEntry, TrackableItem } from '../types/tracker.ts'
import { isRegionDiscovered } from './region-discovery.ts'

export function getH2HCharacterAffinity(
  item: TrackableItem,
  gameState: GameState,
): number | undefined {
  const chars = item.characters ?? []
  if (chars.length < 2) return undefined
  return gameState.characterAffinity[characterPairKey(chars[0], chars[1])] ?? 0
}

export function areH2HCharactersInParty(
  item: TrackableItem,
  gameState: GameState,
): boolean {
  const chars = item.characters ?? []
  if (chars.length < 2) return true
  const party = new Set(gameState.partyMembers)
  return party.has(chars[0]) && party.has(chars[1])
}

export function isH2HAffinityMet(
  item: TrackableItem,
  gameState: GameState,
): boolean {
  const required = item.affinityLevel ?? 0
  if (required === 0) return true
  const current = getH2HCharacterAffinity(item, gameState)
  return (current ?? 0) >= required
}

export function isH2HAvailable(
  item: TrackableItem,
  progress: Record<string, ProgressEntry>,
  gameState: GameState,
): boolean {
  if (progress[item.id]?.completed) return false
  if (!isRegionDiscovered(item, gameState)) return false
  if (!areH2HCharactersInParty(item, gameState)) return false
  if (!isH2HAffinityMet(item, gameState)) return false
  return true
}

export function formatAffinityLevel(level: number): string {
  if (level === 0) return '—'
  return '★'.repeat(level)
}

export function formatAffinityLevelWithColor(level: number): string {
  const stars = formatAffinityLevel(level)
  const label = AFFINITY_LEVEL_LABELS[level]
  return label ? `${stars} (${label})` : stars
}

export const AFFINITY_LEVEL_LABELS: Record<number, string> = {
  1: 'Pink Heart',
  2: 'Yellow Hexagon',
  3: 'Green Square',
  4: 'Blue Diamond',
  5: 'Purple Flower',
}

export function formatH2HAffinityRequirement(level: number): string {
  const symbol = AFFINITY_LEVEL_LABELS[level]
  return symbol ? `${symbol} (Level ${level})` : `Level ${level}`
}

/** Short label for lists: "3 - Green" */
export function formatH2HAffinityShort(level: number): string {
  const full = AFFINITY_LEVEL_LABELS[level]
  if (!full) return String(level)
  const color = full.split(' ')[0]
  return `${level} - ${color}`
}
