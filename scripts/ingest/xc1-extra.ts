import type { GameId, TrackableItem } from '../../src/types/tracker.ts'
import {
  extractQuestGuide,
  parseGenericInfobox,
  parseWikiSection,
  slugify,
  stripWikiMarkup,
} from './parse-infobox.ts'
import { parseAllWikitableWithHeaders } from './parse-wikitable.ts'
import { getPageWikitext, wikiPageUrl } from './wiki-client.ts'

function makeId(gameId: GameId, category: string, name: string): string {
  return `${gameId}-${category}-${slugify(name)}`
}

function parseBulletList(sectionText: string): string[] {
  return sectionText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('*'))
    .map((line) => stripWikiMarkup(line.replace(/^\*+\s*/, '')))
    .filter(Boolean)
}

const XC1_AREA_PAGES: Array<{ page: string; region: string }> = [
  { page: 'Colony 9 (XC1)', region: 'Colony 9' },
  { page: 'Tephra Cave', region: 'Tephra Cave' },
  { page: "Bionis' Leg", region: "Bionis' Leg" },
  { page: 'Colony 6', region: 'Colony 6' },
  { page: 'Satorl Marsh', region: 'Satorl Marsh' },
  { page: "Bionis' Interior", region: "Bionis' Interior" },
  { page: 'Makna Forest', region: 'Makna Forest' },
  { page: 'Frontier Village', region: 'Frontier Village' },
  { page: 'Eryth Sea', region: 'Eryth Sea' },
  { page: 'Alcamoth', region: 'Alcamoth' },
  { page: 'Valak Mountain', region: 'Valak Mountain' },
  { page: 'Sword Valley', region: 'Sword Valley' },
  { page: 'Galahad Fortress', region: 'Galahad Fortress' },
  { page: 'Fallen Arm', region: 'Fallen Arm' },
  { page: 'Mechonis Field', region: 'Mechonis Field' },
  { page: 'Prison Island', region: 'Prison Island' },
]

const XC1_COLLECTION_PAGES = [
  'Colony 6 Collection',
  'Makna Forest Collection',
  'Satorl Marsh Collection',
  'Eryth Sea Collection',
  'Valak Mountain Collection',
  'Alcamoth Collection',
  'Galahad Fortress Collection',
  'Mechonis Field Collection',
  "Bionis' Leg Collection",
  "Bionis' Interior Collection",
  'Tephra Cave Collection',
  'Colony 9 Collection',
  'Frontier Village Collection',
  'Fallen Arm Collection',
  'Sword Valley Collection',
  "Bionis' Shoulder Collection",
]

export async function fetchLandmarks(gameId: GameId): Promise<TrackableItem[]> {
  console.log('  Fetching landmarks from area pages')
  const items: TrackableItem[] = []
  const seen = new Set<string>()

  for (const { page, region } of XC1_AREA_PAGES) {
    const pages = await getPageWikitext([page])
    const wikitext = pages[0]?.wikitext
    if (!wikitext) continue

    const landmarkSection = wikitext.match(/==\s*Landmarks?\s*==([\s\S]*?)(?=\n==[^=]|$)/i)
    if (!landmarkSection) continue

    for (const name of parseBulletList(landmarkSection[1])) {
      const id = makeId(gameId, 'landmark', `${region}-${name}`)
      if (seen.has(id)) continue
      seen.add(id)
      items.push({
        id,
        gameId,
        category: 'landmark',
        name,
        region,
        prerequisites: [],
        wikiUrl: wikiPageUrl(name),
      })
    }
  }

  const secretPage = await getPageWikitext(['Secret Area'])
  const secretWt = secretPage[0]?.wikitext ?? ''
  const xcSecret = secretWt.match(/==\s*\{\{XC\|[^}]*\}\}\s*==([\s\S]*?)(?===\s*\{\{|$)/i)
  if (xcSecret) {
    for (const name of parseBulletList(xcSecret[1])) {
      const id = makeId(gameId, 'landmark', `secret-${name}`)
      if (seen.has(id)) continue
      seen.add(id)
      items.push({
        id,
        gameId,
        category: 'landmark',
        name,
        region: 'Secret Area',
        prerequisites: [],
        description: 'Secret Area',
        wikiUrl: wikiPageUrl(name),
      })
    }
  }

  return items
}

export async function fetchXC1Collectopaedia(gameId: GameId): Promise<TrackableItem[]> {
  console.log('  Fetching XC1 region collections (Collectopaedia)')
  const items: TrackableItem[] = []

  for (const pageTitle of XC1_COLLECTION_PAGES) {
    const pages = await getPageWikitext([pageTitle])
    const wikitext = pages[0]?.wikitext
    if (!wikitext) continue

    const region = pageTitle.replace(' Collection', '')
    const rows = parseAllWikitableWithHeaders(wikitext)
    for (const row of rows) {
      const cells = row.cells.filter((c) => !c.startsWith('class=') && c !== '')
      for (const cell of cells) {
        if (cell.length < 2 || cell.includes('Resist') || cell.includes('Attack')) continue
        const name = stripWikiMarkup(cell)
        if (!name || name.length > 60) continue
        items.push({
          id: makeId(gameId, 'collectopaedia', `${region}-${name}`),
          gameId,
          category: 'collectopaedia',
          name,
          region,
          prerequisites: [],
          description: `Part of ${region} Collection set`,
          wikiUrl: wikiPageUrl(pageTitle),
          wikiPageId: pages[0]?.pageid,
        })
      }
    }
  }

  return items
}

export async function fetchColony6Reconstruction(gameId: GameId): Promise<TrackableItem[]> {
  console.log('  Fetching Colony 6 Reconstruction')
  const pages = await getPageWikitext(['Colony 6 Reconstruction'])
  const wikitext = pages[0]?.wikitext
  if (!wikitext) return []

  const items: TrackableItem[] = []
  const rows = parseAllWikitableWithHeaders(wikitext)
  let currentCategory = 'General'

  for (const row of rows) {
    const cells = row.cells.map((c) => stripWikiMarkup(c)).filter(Boolean)
    if (cells.length === 0) continue

    if (cells.length === 1 && cells[0].length < 40) {
      currentCategory = cells[0]
      continue
    }

    const cost = cells[0]
    const materials = cells.slice(1).join('; ')
    if (!materials) continue

    const name = `${currentCategory}: ${materials.slice(0, 80)}`
    items.push({
      id: makeId(gameId, 'colony_reconstruction', name),
      gameId,
      category: 'colony_reconstruction',
      name: materials.slice(0, 100),
      region: 'Colony 6',
      prerequisites: [],
      description: `${currentCategory} — Cost: ${cost}`,
      rewards: [cost],
      wikiUrl: wikiPageUrl('Colony 6 Reconstruction'),
      wikiPageId: pages[0]?.pageid,
      collectType: currentCategory,
    })
  }

  return items
}

export function parseMonsterExtras(wikitext: string): {
  spawnTime?: string
  respawn?: string
  expReward?: number
  apReward?: number
  drops: string[]
} {
  const fields = parseGenericInfobox(wikitext)
  const drops: string[] = []

  for (const section of ['Drops', 'Chests', 'Wood', 'Silver', 'Gold']) {
    const content = parseWikiSection(wikitext, section)
    if (content) drops.push(`${section}: ${content}`)
  }

  return {
    spawnTime: fields.spawntime || fields['spawn time'],
    respawn: fields.respawn,
    expReward: parseInt(fields.exp?.replace(/\D/g, '') || '', 10) || undefined,
    apReward: parseInt(fields.ap?.replace(/\D/g, '') || '', 10) || undefined,
    drops,
  }
}

export function parseQuestExtras(wikitext: string, fields: Record<string, string>) {
  const guide = extractQuestGuide(wikitext)
  return {
    ...guide,
    giver: fields.giver,
    subLocation: fields.location,
    timeWindow: fields.time,
    questType: fields.type,
    uniqueComments: parseWikiSection(wikitext, 'Unique Comments'),
    results: parseWikiSection(wikitext, 'Results'),
    trivia: parseWikiSection(wikitext, 'Trivia'),
  }
}
