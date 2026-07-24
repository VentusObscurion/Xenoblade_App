import type { GameId } from './tracker.ts'

export interface StoryFlagDef {
  id: string
  label: string
  description?: string
}

export interface DiscoverableRegion {
  id: string
  defaultDiscovered?: boolean
}

export interface PlaythroughConfig {
  /** Affinity charts equivalent (XC1 regions / XC2 titans / XC3 colonies). */
  affinityCharts: readonly string[]
  affinityLabel: string
  affinityHint: string
  regions: readonly DiscoverableRegion[]
  characters: readonly string[]
  storyFlags: readonly StoryFlagDef[]
  /** Show character-pair affinity (XC1 H2H style). */
  hasCharacterAffinity: boolean
  /** Show Colony 6 reconstruction slider (XC1 only). */
  hasColony6: boolean
  /** Max development/affinity stars (XC2 titans use 1–5 integers typically). */
  affinityStep: 'half' | 'whole'
  partyLabel: string
}

const XC1_CONFIG: PlaythroughConfig = {
  affinityCharts: [
    'Colony 9',
    'Colony 6',
    'Central Bionis',
    'Upper Bionis',
    'Hidden Village',
  ],
  affinityLabel: 'Affinity Charts',
  affinityHint: 'Area Affinity Chart stars (supports half-stars).',
  regions: [
    { id: 'Colony 9', defaultDiscovered: true },
    { id: 'Tephra Cave' },
    { id: "Bionis' Leg" },
    { id: 'Colony 6' },
    { id: 'Satorl Marsh' },
    { id: "Bionis' Interior" },
    { id: 'Makna Forest' },
    { id: 'Frontier Village' },
    { id: 'Eryth Sea' },
    { id: 'Alcamoth' },
    { id: 'Valak Mountain' },
    { id: 'Sword Valley' },
    { id: 'Galahad Fortress' },
    { id: 'Fallen Arm' },
    { id: 'Mechonis Field' },
    { id: 'Prison Island' },
    { id: "Bionis' Shoulder" },
    { id: 'Hidden Village' },
  ],
  characters: ['Shulk', 'Reyn', 'Sharla', 'Dunban', 'Melia', 'Riki', 'Fiora'],
  storyFlags: [
    {
      id: 'mechon_attack_colony9',
      label: 'Mechon attack on Colony 9',
      description:
        'Opening raid on Colony 9 — early Colony 9 / Tephra Cave quests unlock after this.',
    },
    {
      id: 'attack_on_colony6',
      label: 'Attack on Colony 6',
      description:
        'After Colony 6 falls. Mostly gates later Junks-repair quests on the Fallen Arm (Refugee Camp content uses area discovery instead).',
    },
    {
      id: 'juju_escorted',
      label: 'Juju escorted to Refugee Camp',
      description:
        'Juju reaches the Refugee Camp — needed for a few Colony 9 return quests (e.g. Out-of-Luck Giorgio).',
    },
    {
      id: 'colony6_reconstruction_started',
      label: 'Colony 6 Reconstruction started',
      description:
        'Reconstruction HQ is open. Also auto-sets when you raise reconstruction % above 0.',
    },
    {
      id: 'melia_met',
      label: 'Melia met in Makna Forest',
      description:
        'First meeting with Melia in Makna. Rarely needed (most Melia content uses party + area discovery).',
    },
    {
      id: 'heading_high_entia_tomb',
      label: 'Heading to the High Entia Tomb',
      description:
        'Story is pushing toward the Tomb under Alcamoth — important for a few timed Alcamoth quests.',
    },
    {
      id: 'course_to_prison_island',
      label: 'In the course to Prison Island',
      description:
        'On the path to Prison Island (e.g. Path to Prison Island / Sister Seals).',
    },
    {
      id: 'miqol_met',
      label: 'Met Miqol in Hidden Machina Village',
      description:
        "Meet Miqol on the Fallen Arm — opens Machina / Hidden Village story gates (e.g. Fiora's Treatment).",
    },
    {
      id: 'mechonis_core_cleared',
      label: 'Mechonis Core cleared',
      description:
        'After Mechonis Core — the big late-game unlock (Alcamoth return, Interior Landing Site, many post-Core quests).',
    },
  ],
  hasCharacterAffinity: true,
  hasColony6: true,
  affinityStep: 'half',
  partyLabel: 'Party',
}

/** XC2 Development Affinity Charts are tied to Titans / nations. */
const XC2_CONFIG: PlaythroughConfig = {
  affinityCharts: [
    'Argentum Trade Guild',
    'Gormott Province',
    'Kingdom of Uraya',
    'Empire of Mor Ardain',
    'Indoline Praetorium',
    'Kingdom of Tantal',
    'Leftherian Archipelago',
  ],
  affinityLabel: 'Titan Affinity (Development)',
  affinityHint:
    'Nation / Titan Development Affinity Charts — the XC2 equivalent of XC1 area charts.',
  regions: [
    { id: 'Argentum Trade Guild', defaultDiscovered: true },
    { id: 'Gormott Province' },
    { id: 'Kingdom of Uraya' },
    { id: 'Empire of Mor Ardain' },
    { id: 'Temperantia' },
    { id: 'Indoline Praetorium' },
    { id: 'Kingdom of Tantal' },
    { id: 'Spirit Crucible Elpys' },
    { id: 'Cliffs of Morytha' },
    { id: 'Land of Morytha' },
    { id: 'Leftherian Archipelago' },
    { id: 'World Tree' },
    { id: 'First Low Orbit Station' },
  ],
  characters: ['Rex', 'Nia', 'Tora', 'Zeke', 'Morag', 'Pyra', 'Mythra'],
  storyFlags: [
    { id: 'left_argentum', label: 'Left Argentum / boarded the Maelstrom' },
    { id: 'uraya_reached', label: 'Reached the Kingdom of Uraya' },
    { id: 'mor_ardain_reached', label: 'Reached the Empire of Mor Ardain' },
    { id: 'indol_reached', label: 'Reached the Indoline Praetorium' },
    { id: 'tantal_reached', label: 'Reached the Kingdom of Tantal' },
    { id: 'leftheria_reached', label: 'Reached the Leftherian Archipelago' },
    { id: 'world_tree_reached', label: 'Reached the World Tree' },
    { id: 'chapter_8_cleared', label: 'Chapter 8 cleared' },
    { id: 'chapter_9_cleared', label: 'Chapter 9 / ending reached' },
  ],
  hasCharacterAffinity: false,
  hasColony6: false,
  affinityStep: 'whole',
  partyLabel: 'Drivers / core party',
}

const XC2_TORNA_CONFIG: PlaythroughConfig = {
  affinityCharts: ['Kingdom of Torna', 'Gormott'],
  affinityLabel: 'Community Affinity',
  affinityHint: 'Torna community affinity charts.',
  regions: [
    { id: 'Kingdom of Torna', defaultDiscovered: true },
    { id: 'Gormott' },
  ],
  characters: ['Addam', 'Mythra', 'Hugo', 'Brighid', 'Jin', 'Haze', 'Lora'],
  storyFlags: [
    { id: 'gormott_reached', label: 'Reached Gormott' },
    { id: 'tornan_titan_core', label: 'Approached the Tornan Titan core events' },
    { id: 'ttgc_ending', label: 'Torna story completed' },
  ],
  hasCharacterAffinity: false,
  hasColony6: false,
  affinityStep: 'whole',
  partyLabel: 'Party',
}

const XC3_CONFIG: PlaythroughConfig = {
  affinityCharts: [
    'Colony 9',
    'Colony 4',
    'Colony 30',
    'Colony Gamma',
    'Colony Iota',
    'Colony Tau',
    'City',
  ],
  affinityLabel: 'Colony Affinity',
  affinityHint: 'Colony Affinity ranks (XC3 equivalent of regional charts).',
  regions: [
    { id: 'Aetia Region', defaultDiscovered: true },
    { id: 'Fornis Region' },
    { id: 'Pentelas Region' },
    { id: 'Keves Castle Region' },
    { id: 'Cadensia Region' },
    { id: 'City' },
    { id: 'Saffronia Province' },
    { id: 'Agnus Castle Region' },
    { id: 'Erythia Sea' },
  ],
  characters: ['Noah', 'Mio', 'Eunie', 'Taion', 'Lanz', 'Sena'],
  storyFlags: [
    { id: 'chapter_3', label: 'Chapter 3 reached' },
    { id: 'chapter_5', label: 'Chapter 5 reached' },
    { id: 'chapter_6', label: 'Chapter 6 reached' },
    { id: 'chapter_7', label: 'Chapter 7 reached' },
    { id: 'origin_reached', label: 'Origin / late-game reached' },
  ],
  hasCharacterAffinity: false,
  hasColony6: false,
  affinityStep: 'whole',
  partyLabel: 'Party',
}

const XC3_FR_CONFIG: PlaythroughConfig = {
  affinityCharts: ['Matthew', 'A', 'Nikol', 'Glimmer', 'Shulk', 'Rex'],
  affinityLabel: 'Affinity Charts',
  affinityHint: 'Future Redeemed party Affinity Charts.',
  regions: [
    { id: 'Cent-Omnia Region', defaultDiscovered: true },
    { id: 'Aurora Shelf' },
    { id: 'Yesterdale' },
    { id: 'The Black Mountains' },
    { id: 'Prison Island' },
  ],
  characters: ['Matthew', 'A', 'Nikol', 'Glimmer', 'Shulk', 'Rex'],
  storyFlags: [
    { id: 'fr_chapter_3', label: 'Chapter 3 reached' },
    { id: 'fr_chapter_4', label: 'Chapter 4 reached' },
    { id: 'fr_chapter_5', label: 'Chapter 5 / ending reached' },
  ],
  hasCharacterAffinity: false,
  hasColony6: false,
  affinityStep: 'whole',
  partyLabel: 'Party',
}

const XC1_FC_CONFIG: PlaythroughConfig = {
  ...XC1_CONFIG,
  affinityCharts: [],
  affinityLabel: 'Affinity Charts',
  affinityHint: 'Future Connected has no XC1-style area Affinity Charts.',
  regions: [
    { id: "Bionis' Shoulder", defaultDiscovered: true },
    { id: 'Alcamoth' },
  ],
  characters: ['Shulk', 'Melia', 'Kino', 'Nene'],
  storyFlags: [
    { id: 'fc_alcamoth', label: 'Reached Alcamoth (FC)' },
    { id: 'fc_ending', label: 'Future Connected ending reached' },
  ],
  hasCharacterAffinity: false,
  hasColony6: false,
  partyLabel: 'Party',
}

const EMPTY_CONFIG: PlaythroughConfig = {
  affinityCharts: [],
  affinityLabel: 'Affinity',
  affinityHint: '',
  regions: [],
  characters: [],
  storyFlags: [],
  hasCharacterAffinity: false,
  hasColony6: false,
  affinityStep: 'whole',
  partyLabel: 'Party',
}

export const PLAYTHROUGH_CONFIG: Record<GameId, PlaythroughConfig> = {
  xc1: XC1_CONFIG,
  'xc1-fc': XC1_FC_CONFIG,
  xc2: XC2_CONFIG,
  'xc2-torna': XC2_TORNA_CONFIG,
  xc3: XC3_CONFIG,
  'xc3-fr': XC3_FR_CONFIG,
  xcx: EMPTY_CONFIG,
}

export function getPlaythroughConfig(gameId: GameId): PlaythroughConfig {
  return PLAYTHROUGH_CONFIG[gameId] ?? EMPTY_CONFIG
}

export function gameSupportsPlaythrough(gameId: GameId): boolean {
  return gameId !== 'xcx'
}
