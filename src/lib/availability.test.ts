import { describe, expect, it } from 'vitest'
import {
  isColony6MaterialAvailable,
  isColony6NextLevelMaterial,
  parseColony6ObtainedFrom,
} from './colony6-availability.ts'
import {
  isImmigrantAvailable,
  parseImmigrantConditions,
} from './colony6-levels.ts'
import { DEFAULT_GAME_STATE, type GameState } from '../types/game-state.ts'
import { evaluatePrerequisites, isItemAvailable } from './prerequisites.ts'
import {
  extractQuestNameFromLabel,
  getQuestProgressMode,
  isStoryFlagMet,
  matchStoryFlag,
  parseReconstructionPercentRequirement,
  parseRequiredAffinityStars,
  resolveAffinityRegion,
  resolveAccessRegion,
} from './quest-prereq-parse.ts'
import { syncNewlyAvailable, markItemSeen, getNewlyAvailableIds } from './new-available.ts'
import type { TrackableItem } from '../types/tracker.ts'

describe('quest-prereq-parse', () => {
  it('resolves affinity regions and star requirements', () => {
    expect(resolveAffinityRegion('Colony 9 Affinity ☆2')).toBe('Colony 9')
    expect(parseRequiredAffinityStars('Colony 9 Affinity ☆3')).toBe(3)
  })

  it('extracts quest names from progress labels', () => {
    expect(extractQuestNameFromLabel('A Thoughtful Present accepted')).toBe(
      'A Thoughtful Present',
    )
    expect(
      extractQuestNameFromLabel('An Errand for the Heropon story quest accepted'),
    ).toBe('An Errand for the Heropon')
  })

  it('detects accepted progress mode', () => {
    expect(getQuestProgressMode('An Errand for the Heropon story quest accepted')).toBe(
      'accepted',
    )
  })

  it('maps access labels to regions', () => {
    expect(resolveAccessRegion('Access to Tephra Cave')).toBe('Tephra Cave')
  })

  it('gates Interior Landing Site on Mechonis Core story flag', () => {
    expect(
      matchStoryFlag('Arrived at the Interior Landing Site (Bionis\' Interior)'),
    ).toBe('mechonis_core_cleared')
    expect(resolveAccessRegion('Arrived at the Interior Landing Site (Bionis\' Interior)')).toBe(
      undefined,
    )
  })

  it('parses Colony 6 reconstruction percent prerequisites', () => {
    expect(parseReconstructionPercentRequirement('Colony 6 Reconstruction 15%')).toBe(15)
    expect(parseReconstructionPercentRequirement('reconstruction at 35%')).toBe(35)
    expect(matchStoryFlag('Colony 6 Reconstruction 15%')).toBe('colony6_reconstruction_15')
    expect(
      isStoryFlagMet('Colony 6 Reconstruction 15%', {
        ...DEFAULT_GAME_STATE,
        colony6Reconstruction: 10,
      }),
    ).toBe(false)
    expect(
      isStoryFlagMet('Colony 6 Reconstruction started', {
        ...DEFAULT_GAME_STATE,
        colony6Reconstruction: 10,
      }),
    ).toBe(true)
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

  it('ignores Noponstone purchase and requires field sources', () => {
    const state: GameState = {
      ...DEFAULT_GAME_STATE,
      discoveredAreas: { ...DEFAULT_GAME_STATE.discoveredAreas, 'Eryth Sea': false },
    }
    expect(
      isColony6MaterialAvailable(
        'Eryth Hiln in Eryth Sea, Purchase: Time Attack for 600 Noponstones (DE)',
        state,
      ),
    ).toBe(false)
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

  it('marks only next section-level materials as level-up targets', () => {
    const housingLv1: TrackableItem = {
      id: 'm1',
      gameId: 'xc1',
      category: 'colony_reconstruction',
      name: 'Material A',
      collectType: 'Housing',
      colonyLevel: 1,
      obtainedFrom: "Volff in Bionis' Leg",
      prerequisites: [],
      wikiUrl: '',
    }
    const housingLv2: TrackableItem = {
      ...housingLv1,
      id: 'm2',
      name: 'Material B',
      colonyLevel: 2,
    }
    const state: GameState = {
      ...DEFAULT_GAME_STATE,
      discoveredAreas: { ...DEFAULT_GAME_STATE.discoveredAreas, "Bionis' Leg": true },
    }
    const levels = { Housing: 0, Commerce: 0, Nature: 0, Special: 0 }
    expect(isColony6NextLevelMaterial(housingLv1, levels, state)).toBe(true)
    expect(isColony6NextLevelMaterial(housingLv2, levels, state)).toBe(false)
    expect(
      isColony6NextLevelMaterial(housingLv2, { ...levels, Housing: 1 }, state),
    ).toBe(true)
  })
})

describe('colony6-levels', () => {
  it('parses immigrant housing requirements', () => {
    const req = parseImmigrantConditions('Housing Lv 4, Commerce Lv 1')
    expect(req.housing).toBe(4)
    expect(req.commerce).toBe(1)
  })

  it('gates immigrants on section levels', () => {
    const rosemary: TrackableItem = {
      id: 'xc1-colony_immigrant-rosemary',
      gameId: 'xc1',
      category: 'colony_immigrant',
      name: 'Rosemary',
      description: 'Housing Lv 4',
      prerequisites: [],
      wikiUrl: '',
    }
    const levels = { Housing: 3, Commerce: 0, Nature: 0, Special: 0 }
    expect(
      isImmigrantAvailable(
        rosemary,
        levels,
        0,
        15,
        [rosemary],
        {},
      ),
    ).toBe(false)
    expect(
      isImmigrantAvailable(
        rosemary,
        { ...levels, Housing: 4 },
        0,
        15,
        [rosemary],
        {},
      ),
    ).toBe(true)
  })
})

describe('quest accepted prerequisites', () => {
  it('unlocks quest when prior quest is accepted or completed', () => {
    const prior: TrackableItem = {
      id: 'xc1-quest-an-errand-for-the-heropon',
      gameId: 'xc1',
      category: 'quest',
      name: 'An Errand for the Heropon',
      prerequisites: [],
      wikiUrl: '',
    }
    const dependent: TrackableItem = {
      id: 'xc1-quest-fixing-time-mushrooms',
      gameId: 'xc1',
      category: 'quest',
      name: 'Fixing Time Mushrooms',
      region: 'Frontier Village',
      prerequisites: [
        {
          type: 'quest',
          label: 'An Errand for the Heropon story quest accepted',
          refId: prior.id,
        },
      ],
      wikiUrl: '',
    }
    const state: GameState = {
      ...DEFAULT_GAME_STATE,
      discoveredAreas: {
        ...DEFAULT_GAME_STATE.discoveredAreas,
        'Frontier Village': true,
      },
      partyMembers: [...DEFAULT_GAME_STATE.partyMembers, 'Riki'],
      playerLevel: 99,
    }

    expect(isItemAvailable(dependent, {}, [prior, dependent], state)).toBe(false)
    expect(
      isItemAvailable(
        dependent,
        { [prior.id]: { itemId: prior.id, accepted: true, completed: false } },
        [prior, dependent],
        state,
      ),
    ).toBe(true)
    expect(
      isItemAvailable(
        dependent,
        { [prior.id]: { itemId: prior.id, completed: true } },
        [prior, dependent],
        state,
      ),
    ).toBe(true)
  })

  it('blocks Colony 6 quests until immigrant is invited', () => {
    const rosemary: TrackableItem = {
      id: 'xc1-colony_immigrant-rosemary',
      gameId: 'xc1',
      category: 'colony_immigrant',
      name: 'Rosemary',
      description: 'Housing Lv 4',
      prerequisites: [],
      wikiUrl: '',
    }
    const quest: TrackableItem = {
      id: 'xc1-quest-in-pursuit-of-love',
      gameId: 'xc1',
      category: 'quest',
      name: 'In Pursuit of Love',
      region: 'Colony 6',
      prerequisites: [
        { type: 'other', label: 'Rosemary invited to Colony 6' },
      ],
      wikiUrl: '',
    }
    const state: GameState = {
      ...DEFAULT_GAME_STATE,
      discoveredAreas: {
        ...DEFAULT_GAME_STATE.discoveredAreas,
        'Colony 6': true,
      },
      playerLevel: 99,
    }

    expect(isItemAvailable(quest, {}, [quest, rosemary], state)).toBe(false)
    expect(
      isItemAvailable(
        quest,
        { [rosemary.id]: { itemId: rosemary.id, completed: true } },
        [quest, rosemary],
        state,
      ),
    ).toBe(true)
  })

  it('blocks Replica Monado until Mechonis Core is cleared', () => {
    const quest: TrackableItem = {
      id: 'xc1-quest-replica-monado-1',
      gameId: 'xc1',
      category: 'quest',
      name: 'Replica Monado 1',
      region: 'Colony 6 (Junks)',
      prerequisites: [
        {
          type: 'other',
          label: "Arrived at the Interior Landing Site (Bionis' Interior)",
        },
      ],
      wikiUrl: '',
    }
    const before: GameState = {
      ...DEFAULT_GAME_STATE,
      discoveredAreas: {
        ...DEFAULT_GAME_STATE.discoveredAreas,
        'Colony 6': true,
        "Bionis' Interior": true,
      },
      playerLevel: 99,
    }
    const after: GameState = {
      ...before,
      storyFlags: {
        ...before.storyFlags,
        mechonis_core_cleared: true,
      },
    }

    expect(isItemAvailable(quest, {}, [quest], before)).toBe(false)
    expect(isItemAvailable(quest, {}, [quest], after)).toBe(true)
  })

  it('blocks Defend Colony 6 on reconstruction percent', () => {
    const quest: TrackableItem = {
      id: 'xc1-quest-defend-colony-6-mechon',
      gameId: 'xc1',
      category: 'quest',
      name: 'Defend Colony 6 - Mechon',
      region: 'Colony 6',
      prerequisites: [
        { type: 'other', label: 'Makna Forest reached' },
        { type: 'other', label: 'Colony 6 Reconstruction 15%' },
      ],
      wikiUrl: '',
    }
    const base: GameState = {
      ...DEFAULT_GAME_STATE,
      discoveredAreas: {
        ...DEFAULT_GAME_STATE.discoveredAreas,
        'Colony 6': true,
        'Makna Forest': true,
      },
      colony6Reconstruction: 10,
      playerLevel: 99,
    }
    expect(isItemAvailable(quest, {}, [quest], base)).toBe(false)
    expect(evaluatePrerequisites(quest, {}, [quest], base)).toEqual({
      status: 'blocked',
      unmet: [
        {
          type: 'other',
          label: 'Colony 6 reconstruction ≥ 15% (now 10%)',
        },
      ],
    })
    expect(
      isItemAvailable(
        quest,
        {},
        [quest],
        { ...base, colony6Reconstruction: 15 },
      ),
    ).toBe(true)
  })

  it('blocks A Gutsy Trader until Colony 6 section levels are met', () => {
    const commerce: TrackableItem = {
      id: 'c1',
      gameId: 'xc1',
      category: 'colony_reconstruction',
      name: 'Mat C1',
      collectType: 'Commerce',
      colonyLevel: 1,
      prerequisites: [],
      wikiUrl: '',
    }
    const commerce2: TrackableItem = {
      ...commerce,
      id: 'c2',
      name: 'Mat C2',
      colonyLevel: 2,
    }
    const nature: TrackableItem = {
      id: 'n1',
      gameId: 'xc1',
      category: 'colony_reconstruction',
      name: 'Mat N1',
      collectType: 'Nature',
      colonyLevel: 1,
      prerequisites: [],
      wikiUrl: '',
    }
    const nature2: TrackableItem = {
      ...nature,
      id: 'n2',
      name: 'Mat N2',
      colonyLevel: 2,
    }
    const werner: TrackableItem = {
      id: 'xc1-colony_immigrant-werner',
      gameId: 'xc1',
      category: 'colony_immigrant',
      name: 'Werner',
      prerequisites: [],
      wikiUrl: '',
    }
    const quest: TrackableItem = {
      id: 'xc1-quest-a-gutsy-trader',
      gameId: 'xc1',
      category: 'quest',
      name: 'A Gutsy Trader',
      region: 'Colony 6',
      prerequisites: [
        { type: 'other', label: 'Makna Forest reached' },
        { type: 'other', label: 'Werner invited to Colony 6' },
        { type: 'level', label: 'Commerce Lv2' },
        { type: 'level', label: 'Nature Lv2.' },
      ],
      wikiUrl: '',
    }
    const state: GameState = {
      ...DEFAULT_GAME_STATE,
      discoveredAreas: {
        ...DEFAULT_GAME_STATE.discoveredAreas,
        'Colony 6': true,
        'Makna Forest': true,
      },
      playerLevel: 99,
    }
    const all = [quest, werner, commerce, commerce2, nature, nature2]
    const invited = {
      [werner.id]: { itemId: werner.id, completed: true },
    }
    expect(isItemAvailable(quest, invited, all, state)).toBe(false)

    const leveled = {
      ...invited,
      [commerce.id]: { itemId: commerce.id, completed: true },
      [commerce2.id]: { itemId: commerce2.id, completed: true },
      [nature.id]: { itemId: nature.id, completed: true },
      [nature2.id]: { itemId: nature2.id, completed: true },
    }
    expect(isItemAvailable(quest, leveled, all, state)).toBe(true)
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

  it('does not re-highlight seen ids after playthrough changes', () => {
    localStorage.clear()
    expect(syncNewlyAvailable(['a', 'b'])).toEqual([])
    expect(syncNewlyAvailable(['a', 'b', 'c'])).toEqual(['c'])
    markItemSeen('c')
    // c drops out of available, then returns
    expect(syncNewlyAvailable(['a', 'b'])).toEqual([])
    expect(syncNewlyAvailable(['a', 'b', 'c'])).toEqual([])
  })
})
