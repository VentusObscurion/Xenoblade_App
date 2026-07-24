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

export function getQuestProgressMode(
  label: string,
): 'accepted' | 'completed' | 'not_completed' {
  const cleaned = cleanWikiMarkup(label)
  if (/\bnot completed\b/i.test(cleaned)) return 'not_completed'
  if (/\baccepted\b/i.test(cleaned)) return 'accepted'
  return 'completed'
}

export function isQuestProgressLabel(label: string): boolean {
  const cleaned = cleanWikiMarkup(label)
  return /\b(accepted|completed|not completed)\b/i.test(cleaned)
}

export function extractQuestNameFromLabel(label: string): string {
  return cleanWikiMarkup(label)
    .replace(/''/g, '')
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\s*\([^)]*route[^)]*\)\s*/gi, ' ')
    // "How Do I Feel? A route completed" / "… route B completed"
    .replace(/\s*\b[AB]\s+route\b/gi, ' ')
    .replace(/\s*\broute\s*[AB]\b/gi, ' ')
    .replace(/\s*\b(accepted|completed|not completed)\b.*$/i, '')
    // Wiki sometimes appends "story quest" after the quest title
    .replace(/\s*\bstory\s+quest\b\s*$/i, '')
    .replace(/\s+or\s+.+$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/^['"]+|['"]+$/g, '')
    .trim()
}

/**
 * "Hoko and Talonyth invited to Colony 6" → all required
 * "Perrine or Mefimefi invited to Colony 6" → any required
 */
export function parseColony6InviteNames(
  label: string,
): { names: string[]; mode: 'all' | 'any' } | undefined {
  const cleaned = cleanWikiMarkup(label)
  const match = cleaned.match(
    /^(.+?)\s+(?:have been\s+)?invited(?:\s+to\s+Colony\s*6)?/i,
  )
  if (!match) return undefined

  const raw = match[1].trim()
  if (!raw) return undefined

  const mode: 'all' | 'any' = /\bor\b/i.test(raw) ? 'any' : 'all'
  const names = raw
    .split(/\s*(?:,|\band\b|\bor\b)\s*/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !/^(and|or)$/i.test(part))

  if (names.length === 0) return undefined
  return { names, mode }
}

/** Resolve area-access style prereqs to a discoverable map region. */
export function resolveAccessRegion(label: string): string | undefined {
  const cleaned = cleanWikiMarkup(label)
  const lower = cleaned.toLowerCase()

  if (/hidden\s+machina\s+village|hidden\s+village/i.test(lower)) return 'Hidden Village'
  if (/pod\s+landing\s+site/i.test(lower)) return 'Makna Forest'
  // Interior Landing Site is post-Mechonis-Core — gated via story flag, not area alone
  if (/interior\s+landing\s+site/i.test(lower)) return undefined
  if (/bionis['’]?\s*interior/i.test(lower)) return "Bionis' Interior"
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
      tests: [
        /mechonis core cleared/,
        /after mechonis core/,
        // Junks lands at Interior Landing Site only after Mechonis Core
        /interior landing site/,
      ],
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

  // Reconstruction percentage thresholds (normalize() strips "%")
  // e.g. "Colony 6 Reconstruction 15%" / "reconstruction at 35%"
  const pct = n.match(/\breconstruction(?:\s+at)?\s+(\d+)\b/)
  if (pct) return `colony6_reconstruction_${pct[1]}`

  return undefined
}

/** Parse "Colony 6 Reconstruction 15%" / "reconstruction at 35%" → required %. */
export function parseReconstructionPercentRequirement(
  label: string,
): number | undefined {
  const n = normalize(label)
  const match = n.match(/\breconstruction(?:\s+at)?\s+(\d+)\b/)
  if (!match) return undefined
  const required = parseInt(match[1], 10)
  return Number.isNaN(required) ? undefined : required
}

export function isStoryFlagMet(label: string, gameState: GameState): boolean | undefined {
  const flagId = matchStoryFlag(label)
  if (!flagId) return undefined

  // Must check "started" before the numeric colony6_reconstruction_* prefix
  if (flagId === 'colony6_reconstruction_started') {
    return (
      gameState.storyFlags.colony6_reconstruction_started === true ||
      gameState.colony6Reconstruction > 0
    )
  }

  if (flagId.startsWith('colony6_reconstruction_')) {
    const required = parseInt(flagId.replace('colony6_reconstruction_', ''), 10)
    if (Number.isNaN(required)) return undefined
    return gameState.colony6Reconstruction >= required
  }

  return gameState.storyFlags[flagId] === true
}

export function parsePartyMemberRequirement(label: string): string | undefined {
  const match = cleanWikiMarkup(label).match(/^(\w+)\s+joined the party$/i)
  return match?.[1]
}

export function parsePartyLeadRequirement(label: string): string | undefined {
  // Party leader is no longer tracked in playthrough — ignore these gates.
  void label
  return undefined
}

export function isColony6InviteRequirement(label: string): boolean {
  return /invited(?:\s+to\s+colony\s*6)?/i.test(cleanWikiMarkup(label))
}

/** "Paola registered in the Colony 9 area Affinity Chart" → "Paola" */
export function parseNpcRegistration(label: string): string | undefined {
  const cleaned = cleanWikiMarkup(label)
  const match = cleaned.match(/^(.+?)\s+registered\b/i)
  if (!match) return undefined
  return match[1].replace(/\s+in the .*$/i, '').trim()
}

/** "Commerce Lv2" / "Housing and Special at level 2" → section level gates */
export type Colony6SectionReq = {
  section: 'Housing' | 'Commerce' | 'Nature' | 'Special'
  level: number
}

function canonicalizeColony6Section(
  raw: string,
): Colony6SectionReq['section'] | undefined {
  const key = raw.toLowerCase()
  return (
    {
      housing: 'Housing',
      commerce: 'Commerce',
      nature: 'Nature',
      special: 'Special',
    } as const
  )[key]
}

export function parseColony6SectionRequirements(
  label: string,
): Colony6SectionReq[] {
  const cleaned = cleanWikiMarkup(label)
  const results: Colony6SectionReq[] = []

  // "Housing and Special at level 2" / "Commerce, Nature at Lv 3"
  const combined = cleaned.match(
    /\b((?:Housing|Commerce|Nature|Special)(?:\s*(?:,|&|and)\s*(?:Housing|Commerce|Nature|Special))*)\s+at\s+(?:level|lv\.?)\s*(\d+)/i,
  )
  if (combined) {
    const level = Number(combined[2])
    const names = combined[1].match(/\b(Housing|Commerce|Nature|Special)\b/gi) ?? []
    for (const name of names) {
      const section = canonicalizeColony6Section(name)
      if (section) results.push({ section, level })
    }
    return results
  }

  // "Commerce Lv2" / "Nature Lv 2." (one or more in the same label)
  for (const match of cleaned.matchAll(
    /\b(Housing|Commerce|Nature|Special)\s*Lv\.?\s*(\d+)/gi,
  )) {
    const section = canonicalizeColony6Section(match[1])
    if (section) results.push({ section, level: Number(match[2]) })
  }
  return results
}

/** @deprecated Prefer parseColony6SectionRequirements for multi-section labels */
export function parseColony6SectionRequirement(
  label: string,
): Colony6SectionReq | undefined {
  return parseColony6SectionRequirements(label)[0]
}

export function getAffinityRegionOptions(): string[] {
  return [...XC1_AFFINITY_REGIONS]
}

export function getStoryFlagDefinitions() {
  return XC1_STORY_FLAGS
}
