import type { GameId, TrackableItem } from '../../src/types/tracker.ts'
import { parseMonsterDrops } from './parse-chest-drops.ts'
import { parseItemExtras } from './parse-item-extras.ts'
import {
  extractQuestGuide,
  parseGenericInfobox,
  parseInfobox,
  parseWikiSection,
  slugify,
  stripWikiMarkup,
} from './parse-infobox.ts'
import { extractWikiTable, parseTableCells } from './parse-wikitable.ts'
import { expandWikiTemplates, getCategoryPagesWithWikitext, getPageWikitext, imageUrlFromInfobox, wikiPageUrl } from './wiki-client.ts'

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

const XC1_ITEM_CATEGORIES = [
  'XC_Vegetables',
  'XC_Fruit',
  'XC_Flowers',
  'XC_Bugs',
  'XC_Parts',
  'XC_Strange',
]

const COLONY6_SECTIONS = ['Housing', 'Commerce', 'Nature', 'Special'] as const

function parseCollectionTable(wikitext: string, region: string, gameId: GameId): TrackableItem[] {
  const start =
    wikitext.search(/\{\|\s*class="xc1 collectopaedia"/i) >= 0
      ? wikitext.search(/\{\|\s*class="xc1 collectopaedia"/i)
      : wikitext.indexOf('{|')
  if (start === -1) return []

  const tableContent = extractWikiTable(wikitext, start)
  if (!tableContent) return []

  const items: TrackableItem[] = []
  const rowChunks = tableContent.split(/\n\s*\|-/)

  for (const chunk of rowChunks) {
    const cells = parseTableCells(chunk)
    if (cells.length < 3) continue
    if (cells[0].toLowerCase().includes('type')) continue

    const collectType = cells[0] || 'Unknown'
    const slotCells = cells.slice(1, 6)
    while (slotCells.length < 5) slotCells.push('')
    const slots = slotCells.map((cell) => (cell && cell.length > 0 ? cell : null))
    const reward = cells[6] ?? cells[cells.length - 1] ?? ''

    if (!collectType || collectType.toLowerCase() === 'reward') continue

    const name = `${region} — ${collectType}`
    items.push({
      id: makeId(gameId, 'collectopaedia', name),
      gameId,
      category: 'collectopaedia',
      name,
      region,
      collectType,
      collectopaediaSlots: slots,
      rewards: reward ? [reward] : undefined,
      prerequisites: [],
      wikiUrl: wikiPageUrl(`${region} Collection`),
    })
  }

  return items
}

function parseColony6Section(
  wikitext: string,
  section: string,
  gameId: GameId,
): TrackableItem[] {
  const sectionMatch = wikitext.match(
    new RegExp(`==\\s*${section}\\s*==([\\s\\S]*?)(?=\\n==[^=]|$)`, 'i'),
  )
  if (!sectionMatch) return []

  const tableStart = sectionMatch[1].indexOf('{|')
  if (tableStart === -1) return []

  const tableContent = extractWikiTable(sectionMatch[1], tableStart)
  if (!tableContent) return []

  const items: TrackableItem[] = []
  const rowChunks = tableContent.split(/\n\s*\|-/)
  let currentLevel: number | undefined
  let currentGold: string | undefined
  let materialIndex = 0

  for (const chunk of rowChunks) {
    const cells = parseTableCells(chunk)
    if (cells.length === 0) continue
    if (cells[0].toLowerCase() === 'level') continue

    const levelMatch = cells[0].match(/^(\d)$/)
    if (levelMatch) {
      currentLevel = parseInt(levelMatch[1], 10)
      currentGold = cells[1] || currentGold
      materialIndex = 0
      if (cells.length >= 4) {
        addColony6Material(items, gameId, section, currentLevel, currentGold, cells[2], cells[3], materialIndex++)
      }
      continue
    }

    if (cells.length >= 2 && currentLevel !== undefined) {
      addColony6Material(items, gameId, section, currentLevel, currentGold, cells[0], cells[1], materialIndex++)
    }
  }

  return items
}

function addColony6Material(
  items: TrackableItem[],
  gameId: GameId,
  section: string,
  level: number,
  gold: string | undefined,
  material: string,
  obtainedFrom: string,
  materialIndex: number,
): void {
  if (!material || /^(level|gold|items needed|obtained from)$/i.test(material)) return

  items.push({
    id: makeId(gameId, 'colony_reconstruction', `${section}-lvl${level}-${materialIndex}-${material}`),
    gameId,
    category: 'colony_reconstruction',
    name: material,
    region: 'Colony 6',
    collectType: section,
    colonyLevel: level,
    colonyGold: gold,
    obtainedFrom,
    prerequisites: [],
    wikiUrl: wikiPageUrl('Colony 6 Reconstruction'),
  })
}

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

export async function fetchXC1Items(gameId: GameId): Promise<TrackableItem[]> {
  console.log('  Fetching XC1 collectable items')
  const items: TrackableItem[] = []
  const seen = new Set<string>()
  const pending: Array<{
    page: { pageid: number; title: string; wikitext?: string }
    name: string
    fields: Record<string, string>
    giftingTemplate: string
  }> = []

  for (const category of XC1_ITEM_CATEGORIES) {
    const pages = await getCategoryPagesWithWikitext(category)
    for (const page of pages) {
      if (!page.wikitext) continue
      const fields = parseInfobox(page.wikitext, ['item', 'Item'])
      const name = (fields.name || page.title).replace(/ \(XC1\)$/, '')
      const id = makeId(gameId, 'item', name)
      if (seen.has(id)) continue
      seen.add(id)

      pending.push({
        page,
        name,
        fields,
        giftingTemplate: page.wikitext.includes('{{Gifting')
          ? `{{Gifting|${fields.name || name}}}`
          : '',
      })
    }
  }

  console.log(`  Expanding gifting templates for ${pending.filter((p) => p.giftingTemplate).length} items`)
  const giftingTemplates = pending.map((p) => p.giftingTemplate)
  const expandedGifting = await expandWikiTemplates(giftingTemplates)

  for (let i = 0; i < pending.length; i++) {
    const { page, name, fields } = pending[i]
    const extras = parseItemExtras(
      page.wikitext ?? '',
      fields.source,
      expandedGifting[i] || undefined,
    )

    items.push({
      id: makeId(gameId, 'item', name),
      gameId,
      category: 'item',
      name,
      collectType: fields.type,
      region: extras.locations[0] ?? fields.source,
      description: fields.caption || fields.description,
      itemLocations: extras.locations,
      itemHasTrade: extras.hasTrade,
      itemTradeInfo: extras.tradeInfo.length > 0 ? extras.tradeInfo : undefined,
      itemGifting: extras.gifting,
      itemQuestUses: extras.questUses.length > 0 ? extras.questUses : undefined,
      prerequisites: [],
      wikiUrl: wikiPageUrl(page.title),
      wikiPageId: page.pageid,
    })
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
    const sets = parseCollectionTable(wikitext, region, gameId)
    for (const set of sets) {
      set.wikiPageId = pages[0]?.pageid
      items.push(set)
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
  for (const section of COLONY6_SECTIONS) {
    const sectionItems = parseColony6Section(wikitext, section, gameId)
    for (const item of sectionItems) {
      item.wikiPageId = pages[0]?.pageid
      items.push(item)
    }
  }

  return items
}

export async function fetchColony6Immigrants(gameId: GameId): Promise<TrackableItem[]> {
  console.log('  Fetching Colony 6 Immigrants')
  const pages = await getPageWikitext(['Colony 6 Immigrants'])
  const wikitext = pages[0]?.wikitext
  if (!wikitext) return []

  const items: TrackableItem[] = []
  const seen = new Set<string>()
  // Section headers like == [[Colony 9 (XC1)|Colony 9]] ==
  const sections = [
    ...wikitext.matchAll(
      /==\s*\[\[([^\]]+)\]\]\s*==([\s\S]*?)(?=\n==\s|\n\[\[Category:|$)/g,
    ),
  ]

  for (const match of sections) {
    const header = stripWikiMarkup(match[1]).replace(/\s*\(XC1\)$/i, '').trim()
    const body = match[2]
    const rows = [...body.matchAll(/\|-?\s*\n\|\[\[([^\]]+)\]\]\s*\n\|([^\n|]+)/g)]
    for (const row of rows) {
      const name = stripWikiMarkup(row[1]).replace(/\s*\(XC1\)$/i, '').trim()
      const conditions = stripWikiMarkup(row[2]).trim()
      if (!name || /^NPC$/i.test(name)) continue
      const id = makeId(gameId, 'colony_immigrant', name)
      if (seen.has(id)) continue
      seen.add(id)
      items.push({
        id,
        gameId,
        category: 'colony_immigrant',
        name,
        region: header,
        description: conditions,
        obtainedFrom: conditions,
        prerequisites: [],
        wikiUrl: wikiPageUrl(name),
        wikiPageId: pages[0]?.pageid,
        collectType: 'Immigrant',
      })
    }
  }

  // Fallback: simpler row parse if section regex missed
  if (items.length === 0) {
    const simpleRows = [...wikitext.matchAll(/\|\[\[([^\|\]]+)(?:\|[^\]]+)?\]\]\s*\n\|([^\n]+)/g)]
    for (const row of simpleRows) {
      const name = stripWikiMarkup(row[1]).replace(/\s*\(XC1\)$/i, '').trim()
      const conditions = stripWikiMarkup(row[2]).trim()
      if (!name || /^(NPC|Conditions)$/i.test(name)) continue
      const id = makeId(gameId, 'colony_immigrant', name)
      if (seen.has(id)) continue
      seen.add(id)
      items.push({
        id,
        gameId,
        category: 'colony_immigrant',
        name,
        description: conditions,
        obtainedFrom: conditions,
        prerequisites: [],
        wikiUrl: wikiPageUrl(name),
        wikiPageId: pages[0]?.pageid,
        collectType: 'Immigrant',
      })
    }
  }

  console.log(`  Colony 6 Immigrants: ${items.length}`)
  return items
}

const XC1_NPC_CATEGORIES: Array<{ category: string; region: string }> = [
  { category: 'Colony_9_NPCs', region: 'Colony 9' },
  { category: 'Tephra_Cave_NPCs', region: 'Tephra Cave' },
  { category: "Bionis'_Leg_NPCs", region: "Bionis' Leg" },
  { category: 'Colony_6_NPCs', region: 'Colony 6' },
  { category: 'Ether_Mine_NPCs', region: 'Ether Mine' },
  { category: 'Satorl_Marsh_NPCs', region: 'Satorl Marsh' },
  { category: 'Makna_Forest_NPCs', region: 'Makna Forest' },
  { category: 'Frontier_Village_NPCs', region: 'Frontier Village' },
  { category: 'Eryth_Sea_NPCs', region: 'Eryth Sea' },
  { category: 'Alcamoth_NPCs', region: 'Alcamoth' },
  { category: 'Valak_Mountain_NPCs', region: 'Valak Mountain' },
  { category: 'Sword_Valley_NPCs', region: 'Sword Valley' },
  { category: 'Fallen_Arm_NPCs', region: 'Fallen Arm' },
  { category: 'Mechonis_Field_NPCs', region: 'Mechonis Field' },
  { category: 'Junks_NPCs', region: 'Junks' },
]

export async function fetchXC1Persons(gameId: GameId): Promise<TrackableItem[]> {
  console.log('  Fetching XC1 Persons (NPCs)')
  const items: TrackableItem[] = []
  const seen = new Set<string>()

  for (const { category, region } of XC1_NPC_CATEGORIES) {
    console.log(`    Category: ${category}`)
    try {
      const pages = await getCategoryPagesWithWikitext(category)
      for (const page of pages) {
        if (!page.wikitext) continue
        if (/NPCs$/i.test(page.title)) continue
        const fields = parseGenericInfobox(page.wikitext)
        const hasNpcBox =
          Object.keys(fields).length > 0 &&
          (fields.location || fields.time_active || fields.timeactive || fields.race)
        if (!hasNpcBox) continue

        const name = stripWikiMarkup(fields.name || page.title)
          .replace(/\s*\(XC1\)\s*$/i, '')
          .trim()
        if (!name) continue
        const id = makeId(gameId, 'person', name)
        if (seen.has(id)) continue
        seen.add(id)

        const location =
          stripWikiMarkup(fields.location || '').trim() || region
        const timeActive = stripWikiMarkup(
          fields.time_active || fields.timeactive || fields.time || '',
        ).trim()
        const personality = stripWikiMarkup(fields.personality || '').trim()
        const race = stripWikiMarkup(fields.race || '').trim()
        const gender = stripWikiMarkup(fields.gender || '').trim()
        const age = stripWikiMarkup(fields.age || '').trim()

        const descParts = [personality, race && `Race: ${race}`, gender && `Gender: ${gender}`, age && `Age: ${age}`]
          .filter(Boolean)

        items.push({
          id,
          gameId,
          category: 'person',
          name,
          region: location,
          timeWindow: timeActive || undefined,
          description: descParts.join(' · ') || undefined,
          prerequisites: [],
          wikiUrl: wikiPageUrl(page.title),
          wikiPageId: page.pageid,
          imageUrl: imageUrlFromInfobox(fields),
          role: race || undefined,
        })
      }
    } catch (err) {
      console.warn(`  Warning: Could not fetch ${category}:`, err)
    }
  }

  console.log(`  XC1 Persons: ${items.length}`)
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
  const drops = parseMonsterDrops(wikitext)

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
