import type { ProgressEntry, TrackableItem } from '../types/tracker.ts'

export type Colony6Section = 'Housing' | 'Commerce' | 'Nature' | 'Special'

export const COLONY6_SECTIONS: Colony6Section[] = [
  'Housing',
  'Commerce',
  'Nature',
  'Special',
]

/** Derive section level from completed reconstruction materials. */
export function getColony6SectionLevel(
  section: Colony6Section,
  materials: TrackableItem[],
  progress: Record<string, ProgressEntry>,
): number {
  let level = 0
  for (let candidate = 1; candidate <= 5; candidate++) {
    const atLevel = materials.filter(
      (item) =>
        item.category === 'colony_reconstruction' &&
        item.collectType === section &&
        item.colonyLevel === candidate,
    )
    if (atLevel.length === 0) break
    const allDone = atLevel.every((item) => progress[item.id]?.completed)
    if (!allDone) break
    level = candidate
  }
  return level
}

export function getAllColony6Levels(
  materials: TrackableItem[],
  progress: Record<string, ProgressEntry>,
): Record<Colony6Section, number> {
  return {
    Housing: getColony6SectionLevel('Housing', materials, progress),
    Commerce: getColony6SectionLevel('Commerce', materials, progress),
    Nature: getColony6SectionLevel('Nature', materials, progress),
    Special: getColony6SectionLevel('Special', materials, progress),
  }
}

/** Approx reconstruction % from average section levels (matches playthrough slider loosely). */
export function estimateColony6Percent(
  levels: Record<Colony6Section, number>,
): number {
  const sum =
    levels.Housing + levels.Commerce + levels.Nature + levels.Special
  return Math.round((sum / 20) * 100)
}

export interface ImmigrantRequirements {
  housing?: number
  commerce?: number
  nature?: number
  special?: number
  minPercent?: number
  population?: number
  leader?: string
  requiresResident?: string[]
  excludesResident?: string[]
}

export function parseImmigrantConditions(conditions: string): ImmigrantRequirements {
  const req: ImmigrantRequirements = {}
  const housing = conditions.match(/Housing\s*Lv\.?\s*(\d+)/i)
  if (housing) req.housing = Number(housing[1])
  const commerce = conditions.match(/Commerce\s*Lv\.?\s*(\d+)/i)
  if (commerce) req.commerce = Number(commerce[1])
  const nature = conditions.match(/Nature\s*Lv\.?\s*(\d+)/i)
  if (nature) req.nature = Number(nature[1])
  const special = conditions.match(/Special\s*Lv\.?\s*(\d+)/i)
  if (special) req.special = Number(special[1])
  const percent = conditions.match(/(\d+)\s*%\s*complete/i)
  if (percent) req.minPercent = Number(percent[1])
  const pop = conditions.match(/population\s*(\d+)/i)
  if (pop) req.population = Number(pop[1])
  const leader = conditions.match(/(\w+)\s+as leader/i)
  if (leader) req.leader = leader[1]

  const requires: string[] = []
  const excludes: string[] = []
  const residentParts = conditions.matchAll(
    /\[\[([^\]]+)\]\]\s+is (not )?resident/gi,
  )
  for (const match of residentParts) {
    const name = match[1].replace(/\s*\(XC1\)$/i, '').trim()
    if (match[2]) excludes.push(name)
    else requires.push(name)
  }
  // Plain text "X is resident"
  const plainReq = conditions.matchAll(/([A-Z][A-Za-z'’\-]+)\s+is resident/g)
  for (const match of plainReq) {
    if (!requires.includes(match[1])) requires.push(match[1])
  }
  const plainEx = conditions.matchAll(/([A-Z][A-Za-z'’\-]+)\s+is not resident/g)
  for (const match of plainEx) {
    if (!excludes.includes(match[1])) excludes.push(match[1])
  }

  if (requires.length) req.requiresResident = requires
  if (excludes.length) req.excludesResident = excludes
  return req
}

function isResident(
  name: string,
  immigrants: TrackableItem[],
  progress: Record<string, ProgressEntry>,
): boolean {
  const item = immigrants.find(
    (i) => i.name.toLowerCase() === name.toLowerCase(),
  )
  if (!item) return false
  const entry = progress[item.id]
  return entry?.completed === true || entry?.accepted === true
}

export function isImmigrantAvailable(
  immigrant: TrackableItem,
  levels: Record<Colony6Section, number>,
  percent: number,
  population: number,
  immigrants: TrackableItem[],
  progress: Record<string, ProgressEntry>,
): boolean {
  const req = parseImmigrantConditions(immigrant.description ?? immigrant.obtainedFrom ?? '')
  if (req.housing !== undefined && levels.Housing < req.housing) return false
  if (req.commerce !== undefined && levels.Commerce < req.commerce) return false
  if (req.nature !== undefined && levels.Nature < req.nature) return false
  if (req.special !== undefined && levels.Special < req.special) return false
  if (req.minPercent !== undefined && percent < req.minPercent) return false
  if (req.population !== undefined && population < req.population) return false
  // Leader notes (e.g. "Shulk as leader") stay visible in Conditions — not gated here.
  for (const name of req.requiresResident ?? []) {
    if (!isResident(name, immigrants, progress)) return false
  }
  for (const name of req.excludesResident ?? []) {
    if (isResident(name, immigrants, progress)) return false
  }
  return true
}

/** Rough population: base 15 + 5 per invited immigrant (good enough for unlock gates). */
export function estimateColony6Population(
  immigrants: TrackableItem[],
  progress: Record<string, ProgressEntry>,
): number {
  const invited = immigrants.filter((i) => {
    const entry = progress[i.id]
    return entry?.completed === true || entry?.accepted === true
  }).length
  return Math.min(150, 15 + invited * 8)
}
