import { describe, expect, it } from 'vitest'
import {
  parseColony6ObtainedFrom,
  isColony6MaterialAvailable,
} from './colony6-availability.ts'
import { DEFAULT_GAME_STATE, type GameState } from '../types/game-state.ts'
import {
  extractQuestNameFromLabel,
  parseRequiredAffinityStars,
  resolveAffinityRegion,
  resolveAccessRegion,
} from './quest-prereq-parse.ts'
import { syncNewlyAvailable, markItemSeen, getNewlyAvailableIds } from './new-available.ts'

describe('quest-prereq-parse', () => {
  it('resolves affinity regions and star requirements', () => {
    expect(resolveAffinityRegion('Colony 9 Affinity ☆2')).toBe('Colony 9')
    expect(parseRequiredAffinityStars('Colony 9 Affinity ☆3')).toBe(3)
  })

  it('extracts quest names from progress labels', () => {
    expect(extractQuestNameFromLabel('A Thoughtful Present accepted')).toBe(
      'A Thoughtful Present',
    )
  })

  it('maps access labels to regions', () => {
    expect(resolveAccessRegion('Access to Tephra Cave')).toBe('Tephra Cave')
  })
})

describe('colony6-availability', () => {
  it('parses regions and story gates from obtainedFrom', () => {
    const req = parseColony6ObtainedFrom(
      "Eryth Hiln in Eryth Sea, Trade: Talia after Mechonis Core, Purchase: Time Attack for 600 Noponstones (DE)",
    )
    expect(req.regions).toContain('Eryth Sea')
    expect(req.storyFlags).toContain('mechonis_core_cleared')
    expect(req.hasPurchaseFallback).toBe(true)
  })

  it('treats purchase fallback as available', () => {
    const state: GameState = {
      ...DEFAULT_GAME_STATE,
      discoveredAreas: { ...DEFAULT_GAME_STATE.discoveredAreas, 'Eryth Sea': false },
    }
    expect(
      isColony6MaterialAvailable(
        'Eryth Hiln in Eryth Sea, Purchase: Time Attack for 600 Noponstones (DE)',
        state,
      ),
    ).toBe(true)
  })

  it('blocks when region missing and no purchase', () => {
    const state: GameState = {
      ...DEFAULT_GAME_STATE,
      discoveredAreas: { ...DEFAULT_GAME_STATE.discoveredAreas, "Bionis' Leg": false },
    }
    expect(
      isColony6MaterialAvailable("Volff in Bionis' Leg", state),
    ).toBe(false)
  })

  it('allows when region discovered', () => {
    const state: GameState = {
      ...DEFAULT_GAME_STATE,
      discoveredAreas: { ...DEFAULT_GAME_STATE.discoveredAreas, "Bionis' Leg": true },
    }
    expect(
      isColony6MaterialAvailable("Volff in Bionis' Leg", state),
    ).toBe(true)
  })
})

describe('new-available', () => {
  it('primes without highlighting, then marks newly unlocked ids', () => {
    localStorage.clear()
    expect(syncNewlyAvailable(['a', 'b'])).toEqual([])
    expect(syncNewlyAvailable(['a', 'b', 'c'])).toEqual(['c'])
    markItemSeen('c')
    expect([...getNewlyAvailableIds()]).toEqual([])
  })
})
