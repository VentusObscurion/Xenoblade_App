import type { GameState } from '../types/game-state.ts'
import { XC1_AFFINITY_REGIONS, XC1_STORY_FLAGS } from '../types/game-state.ts'
import { getCanonicalRegion } from './region-discovery.ts'
import { cleanWikiMarkup } from './wiki-text.ts'

function normalize(text: string): string {
  return cleanWikiMarkup(text)
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Map wiki affinity labels onto the 5 Affinity Chart regions. */
export function resolveAffinityRegion(label: string): string | undefined {
  const cleaned = cleanWikiMarkup(label)
  const lower = cleaned.toLowerCase()

  if (/central\s+bionis/i.test(lower)) return 'Central Bionis'
  if (/upper\s+bionis/i.test(lower)) return 'Upper Bionis'
  if (/hidden\s+village/i.test(lower)) return 'Hidden Village'
  if (/colony\s*9/i.test(lower)) return 'Colony 9'
  if (/colony\s*6/i.test(lower)) return 'Colony 6'

  return undefined
}

export function parseRequiredAffinityStars(label: string): number | undefined {
  const cleaned = cleanWikiMarkup(label)
  if (/registered|affinity\s+chart|affinity\s+link|competing/i.test(cleaned)) {
    return undefined
  }

  const quarterMatch = cleaned.match(/(\d)\s*¼/)
  if (quarterMatch) return parseInt(quarterMatch[1], 10) + 0.25

  const halfMatch = cleaned.match(/(\d)\s*½|(\d)\s*1\/2/)
  if (halfMatch) {
    const whole = parseInt(halfMatch[1] ?? halfMatch[2], 10)
    return whole + 0.5
  }

  const starMatch = cleaned.match(/[☆★]\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*[☆★]/)
  if (starMatch) return parseFloat(starMatch[1] ?? starMatch[2])

  const textMatch = cleaned.match(/(\d)\s*[- ]*star/i)
  if (textMatch) return parseInt(textMatch[1], 10)

  return undefined
}

export function isAreaAffinityMet(label: string, gameState: GameState): boolean {
  const region = resolveAffinityRegion(label)
  const required = parseRequiredAffinityStars(label)
  if (!region || required === undefined) return true
  const current = gameState.areaAffinity[region] ?? 0
  return current >= required
}

export function isIgnorablePrerequisite(label: string): boolean {
  return /^(none|n\/a)$/i.test(cleanWikiMarkup(label).trim())
}

export function isQuestProgressLabel(label: string): boolean {
  const cleaned = cleanWikiMarkup(label)
  return /\b(accepted|completed|not completed)\b/i.test(cleaned)
}

export function extractQuestNameFromLabel(label: string): string {
  return cleanWikiMarkup(label)
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\s*\([^)]*route[^)]*\)\s*/gi, ' ')
    .replace(/\s*\b(accepted|completed|not completed)\b.*$/i, '')
    .replace(/\s+or\s+.+$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Resolve area-access style prereqs to a discoverable map region. */
export function resolveAccessRegion(label: string): string | undefined {
  const cleaned = cleanWikiMarkup(label)
  const lower = cleaned.toLowerCase()

  if (/hidden\s+machina\s+village|hidden\s+village/i.test(lower)) return 'Hidden Village'
  if (/pod\s+landing\s+site/i.test(lower)) return 'Makna Forest'
  if (/interior\s+landing\s+site|bionis['’]?\s*interior/i.test(lower)) {
    return "Bionis' Interior"
  }
  if (/high\s+entia\s+tomb/i.test(lower)) return 'Eryth Sea'
  if (/central\s+factory|agniratha/i.test(lower)) return 'Mechonis Field'
  if (/vilia\s+lake|tephra\s+cave/i.test(lower)) return 'Tephra Cave'
  if (/sororal\s+statues|satorl/i.test(lower)) return 'Satorl Marsh'
  if (/refugee\s+camp/i.test(lower)) return 'Colony 6'

  const accessMatch = cleaned.match(
    /(?:access to|arrived at|reached)\s+(.+?)(?:\s+in\s+order|\s+area|\s*$)/i,
  )
  if (accessMatch) {
    return getCanonicalRegion(accessMatch[1]) ?? getCanonicalRegion(cleaned)
  }

  if (/\b(area\s+)?reached\b/i.test(cleaned) || /^access to\b/i.test(cleaned)) {
    return getCanonicalRegion(cleaned)
  }

  return getCanonicalRegion(cleaned)
}

export function matchStoryFlag(label: string): string | undefined {
  const n = normalize(label)

  const patterns: Array<{ id: string; tests: RegExp[] }> = [
    {
      id: 'mechonis_core_cleared',
      tests: [/mechonis core cleared/, /mechonis core/],
    },
    {
      id: 'mechon_attack_colony9',
      tests: [/mechon attack in colony 9/, /mechon raid/, /attack in colony 9/],
    },
    {
      id: 'attack_on_colony6',
      tests: [/attack on colony 6/, /after the attack on colony 6/],
    },
    {
      id: 'juju_escorted',
      tests: [/escorting juju/, /juju to the refugee/],
    },
    {
      id: 'melia_met',
      tests: [/melia met/],
    },
    {
      id: 'colony6_reconstruction_started',
      tests: [
        /colony 6 reconstruction started/,
        /colony 6 reconstruction triggered/,
        /access to colony 6 reconstruction/,
      ],
    },
    {
      id: 'miqol_met',
      tests: [/miqol met/, /met miqol/],
    },
    {
      id: 'heading_high_entia_tomb',
      tests: [/heading to the high entia tomb/],
    },
    {
      id: 'course_to_prison_island',
      tests: [/course to prison island/],
    },
  ]

  for (const { id, tests } of patterns) {
    if (tests.some((re) => re.test(n))) return id
  }

  // Reconstruction percentage thresholds
  const pct = n.match(/reconstruction(?:\s+at)?\s+(\d+)\s*%/)
  if (pct) return `colony6_reconstruction_${pct[1]}`

  return undefined
}

export function isStoryFlagMet(label: string, gameState: GameState): boolean | undefined {
  const flagId = matchStoryFlag(label)
  if (!flagId) return undefined

  if (flagId.startsWith('colony6_reconstruction_')) {
    const required = parseInt(flagId.replace('colony6_reconstruction_', ''), 10)
    if (Number.isNaN(required)) return undefined
    return gameState.colony6Reconstruction >= required
  }

  if (flagId === 'colony6_reconstruction_started') {
    return (
      gameState.storyFlags.colony6_reconstruction_started === true ||
      gameState.colony6Reconstruction > 0
    )
  }

  return gameState.storyFlags[flagId] === true
}

export function parsePartyMemberRequirement(label: string): string | undefined {
  const match = cleanWikiMarkup(label).match(/^(\w+)\s+joined the party$/i)
  return match?.[1]
}

export function parsePartyLeadRequirement(label: string): string | undefined {
  const cleaned = cleanWikiMarkup(label)
  const match =
    cleaned.match(/^(\w+)\s+in the lead$/i) ||
    cleaned.match(/^(\w+)\s+must be the active party leader$/i) ||
    cleaned.match(/^(\w+)\s+in the lead inspecting/i)
  return match?.[1]
}

export function isColony6InviteRequirement(label: string): boolean {
  return /invited to colony 6/i.test(cleanWikiMarkup(label))
}

export function getAffinityRegionOptions(): string[] {
  return [...XC1_AFFINITY_REGIONS]
}

export function getStoryFlagDefinitions() {
  return XC1_STORY_FLAGS
}
