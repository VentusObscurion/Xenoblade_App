import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Category, DataManifest, GameId, TrackableItem } from '../../src/types/tracker.ts'
import {
  extractPrerequisites,
  parseGenericInfobox,
  parseInfobox,
  parseInfoboxRaw,
  parseLevel,
  parseListField,
  slugify,
} from './parse-infobox.ts'
import { findHeaderIndex, parseAllWikitableWithHeaders, parseWikitableWithHeaders } from './parse-wikitable.ts'
import {
  fetchColony6Immigrants,
  fetchColony6Reconstruction,
  fetchLandmarks,
  fetchXC1Collectopaedia,
  fetchXC1Items,
  parseMonsterExtras,
  parseQuestExtras,
} from './xc1-extra.ts'
import { parseH2HPage } from './parse-h2h.ts'
import {
  getCategoryPagesRecursive,
  getCategoryPagesWithWikitext,
  getPageWikitext,
  wikiPageUrl,
} from './wiki-client.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, '../../public/data')

export const XC1_QUEST_CATEGORIES: Array<{ category: string; region: string }> = [
  { category: 'Colony_9_Quests', region: 'Colony 9' },
  { category: 'Tephra_Cave_Quests', region: 'Tephra Cave' },
  { category: 'Bionis_Leg_Quests', region: "Bionis' Leg" },
  { category: 'Colony_6_Quests', region: 'Colony 6' },
  { category: 'Satorl_Marsh_Quests', region: 'Satorl Marsh' },
  { category: 'Bionis_Interior_Quests', region: "Bionis' Interior" },
  { category: 'Makna_Forest_Quests', region: 'Makna Forest' },
  { category: 'Frontier_Village_Quests', region: 'Frontier Village' },
  { category: 'Eryth_Sea_Quests', region: 'Eryth Sea' },
  { category: 'Valak_Mountain_Quests', region: 'Valak Mountain' },
  { category: 'Sword_Valley_Quests', region: 'Sword Valley' },
  { category: 'Galahad_Fortress_Quests', region: 'Galahad Fortress' },
  { category: 'Fallen_Arm_Quests', region: 'Fallen Arm' },
  { category: 'Mechonis_Field_Quests', region: 'Mechonis Field' },
  { category: 'Alcamoth_Quests', region: 'Alcamoth' },
]

const FC_QUEST_CATEGORIES: Array<{ category: string; region: string }> = [
  { category: 'XCFC_Quests', region: "Bionis' Shoulder" },
  { category: 'XCFC_Standard_Quests', region: "Bionis' Shoulder" },
]

async function fetchFCQuests(gameId: GameId): Promise<TrackableItem[]> {
  console.log('  Fetching FC quests')
  const items: TrackableItem[] = []
  const seen = new Set<string>()

  const listPages = await getPageWikitext(["Bionis' Shoulder Quests"])
  const listPage = listPages[0]
  if (listPage?.wikitext) {
    const { headers } = parseWikitableWithHeaders(listPage.wikitext)
    const rows = parseAllWikitableWithHeaders(listPage.wikitext)
    const nameIdx = findHeaderIndex(headers, 'quest name', 'quest', 'name', 'title')
    const giverIdx = findHeaderIndex(headers, 'giver', 'client', 'who')
    const levelIdx = findHeaderIndex(headers, 'lv', 'level')
    const rewardIdx = findHeaderIndex(headers, 'reward')

    for (const row of rows) {
      const cells = row.cells
      const name = cells[nameIdx >= 0 ? nameIdx : 1]
      if (!name || isQuestListPage(name)) continue
      const id = makeId(gameId, 'quest', name)
      if (seen.has(id)) continue
      seen.add(id)

      const prerequisites: TrackableItem['prerequisites'] = []
      const level = parseLevel(levelIdx >= 0 ? cells[levelIdx] : cells[0])
      if (level) {
        prerequisites.push({ type: 'level', label: `Level ${level}` })
      }

      const rewards =
        rewardIdx >= 0 && cells[rewardIdx]
          ? cells[rewardIdx].split(/[,;]\s*/).filter(Boolean)
          : undefined

      items.push({
        id,
        gameId,
        category: 'quest',
        name,
        region: "Bionis' Shoulder",
        level,
        prerequisites,
        rewards,
        description: giverIdx >= 0 ? `Giver: ${cells[giverIdx]}` : undefined,
        wikiUrl: wikiPageUrl(name),
      })
    }
  }

  if (items.length === 0) {
    return fetchQuests(FC_QUEST_CATEGORIES, gameId)
  }

  return items
}

function makeId(gameId: GameId, category: Category, name: string): string {
  return `${gameId}-${category}-${slugify(name)}`
}

function isQuestListPage(name: string): boolean {
  return / Quests$/i.test(name)
}

function parseQuestPage(
  page: { pageid: number; title: string; wikitext?: string },
  gameId: GameId,
  region: string,
): TrackableItem | null {
  if (!page.wikitext) return null
  if (isQuestListPage(page.title)) return null

  const rawFields = parseInfoboxRaw(page.wikitext, ['quest', 'Quest'])
  if (Object.keys(rawFields).length === 0) return null

  const fields = parseInfobox(page.wikitext, ['quest', 'Quest'])
  const extras = parseQuestExtras(page.wikitext, fields)
  const displayName = fields.name || page.title
  // Use wiki page title for IDs so "Challenge 1 (Colony 9)" ≠ "Challenge 1 (Tephra Cave)"
  const idSource = page.title.replace(/\s*\(XC1\)\s*$/i, '')
  const prerequisites = extractPrerequisites(fields, [
    'prereqs',
    'prerequisites',
    'prerequisite',
    'requirements',
    'req',
    'conditions',
    'affinity',
  ])

  const rewards = rawFields.rewards ? parseListField(rawFields.rewards) : undefined

  return {
    id: makeId(gameId, 'quest', idSource),
    gameId,
    category: 'quest',
    name: displayName,
    region: fields.location || region,
    level: parseLevel(fields.level),
    prerequisites,
    rewards,
    description: extras.description || fields.objective || fields.objectives,
    walkthrough: extras.walkthrough,
    giver: extras.giver,
    subLocation: extras.subLocation,
    timeWindow: extras.timeWindow,
    questType: extras.questType,
    uniqueComments: extras.uniqueComments,
    results: extras.results,
    trivia: extras.trivia,
    wikiUrl: wikiPageUrl(page.title),
    wikiPageId: page.pageid,
  }
}

export async function fetchQuests(
  categories: Array<{ category: string; region: string }>,
  gameId: GameId,
): Promise<TrackableItem[]> {
  const items: TrackableItem[] = []
  const seen = new Set<string>()

  for (const { category, region } of categories) {
    console.log(`  Fetching quests: ${category}`)
    try {
      const pages = await getCategoryPagesWithWikitext(category)
      for (const page of pages) {
        const item = parseQuestPage(page, gameId, region)
        if (item && !seen.has(item.id)) {
          seen.add(item.id)
          items.push(item)
        }
      }
    } catch (err) {
      console.warn(`  Warning: Could not fetch ${category}:`, err)
    }
  }

  return items
}

async function fetchUniqueMonsters(
  category: string,
  gameId: GameId,
): Promise<TrackableItem[]> {
  console.log(`  Fetching unique monsters: ${category}`)
  const pages = await getCategoryPagesWithWikitext(category)
  const items: TrackableItem[] = []

  for (const page of pages) {
    if (!page.wikitext) continue
    const fields = parseInfobox(page.wikitext, [
      'XC Enemy',
      'XC1 Enemy',
      'Enemy',
      'XCFC Enemy',
    ])
    const generic = Object.keys(fields).length === 0 ? parseGenericInfobox(page.wikitext) : fields
    const name = generic.name || page.title

    if (/ Unique Monsters$/i.test(name) || page.title.endsWith('_Unique_Monsters')) {
      continue
    }

    const level = parseLevel(generic.level)
    const region = generic.area || generic.location
    if (level === undefined && !region) continue
    const prerequisites = extractPrerequisites(generic, ['conditions', 'requirements', 'notes'])

    if (generic.area || generic.location) {
      prerequisites.push({
        type: 'area',
        label: generic.area || generic.location || '',
      })
    }

    const monsterExtras = parseMonsterExtras(page.wikitext)

    items.push({
      id: makeId(gameId, 'unique_monster', name),
      gameId,
      category: 'unique_monster',
      name,
      region,
      level,
      prerequisites,
      spawnTime: monsterExtras.spawnTime,
      respawn: monsterExtras.respawn,
      expReward: monsterExtras.expReward,
      apReward: monsterExtras.apReward,
      drops: monsterExtras.drops.length > 0 ? monsterExtras.drops : undefined,
      wikiUrl: wikiPageUrl(page.title),
      wikiPageId: page.pageid,
    })
  }

  return items
}

async function fetchAchievements(gameId: GameId): Promise<TrackableItem[]> {
  console.log('  Fetching achievements: Achievements (XC1)')
  const pages = await getPageWikitext(['Achievements (XC1)'])
  const page = pages[0]
  if (!page?.wikitext) return []

  const { headers, rows: firstTableRows } = parseWikitableWithHeaders(page.wikitext)
  const allRows = parseAllWikitableWithHeaders(page.wikitext)
  const rows = allRows.length > firstTableRows.length ? allRows : firstTableRows
  const nameIdx = findHeaderIndex(headers, 'award', 'achievement', 'name', 'title')
  const descIdx = findHeaderIndex(headers, 'details', 'description', 'requirement')
  const expIdx = findHeaderIndex(headers, 'exp', 'ap', 'points')

  const items: TrackableItem[] = []
  for (const row of rows) {
    const cells = row.cells
    const name = cells[nameIdx >= 0 ? nameIdx : 0]
    if (!name) continue

    const description = descIdx >= 0 ? cells[descIdx] : cells[1]
    const prerequisites: TrackableItem['prerequisites'] = []
    if (description) {
      prerequisites.push({ type: 'other', label: description })
    }
    if (expIdx >= 0 && cells[expIdx]) {
      prerequisites.push({ type: 'other', label: `${cells[expIdx]} EXP` })
    }

    items.push({
      id: makeId(gameId, 'achievement', name),
      gameId,
      category: 'achievement',
      name,
      prerequisites,
      description,
      wikiUrl: wikiPageUrl('Achievements (XC1)'),
      wikiPageId: page.pageid,
    })
  }

  return items
}

async function enrichHeartToHearts(items: TrackableItem[]): Promise<TrackableItem[]> {
  if (items.length === 0) return items

  console.log(`  Enriching ${items.length} heart-to-hearts from individual pages`)
  const titles = items.map((item) => item.name.replace(/ /g, '_'))
  const pages = await getPageWikitext(titles)
  const wikitextByTitle = new Map<string, string>()
  for (const page of pages) {
    if (page.wikitext) {
      wikitextByTitle.set(page.title.replace(/_/g, ' '), page.wikitext)
    }
  }

  return items.map((item) => {
    const wikitext = wikitextByTitle.get(item.name)
    if (!wikitext) return item

    const details = parseH2HPage(wikitext)
    const prerequisites = [...item.prerequisites]

    if (details.subLocation) {
      const locIdx = prerequisites.findIndex((p) => p.type === 'area')
      if (locIdx >= 0) {
        prerequisites[locIdx] = { type: 'area', label: details.subLocation }
      } else {
        prerequisites.unshift({ type: 'area', label: details.subLocation })
      }
    }

    if (details.affinityLevel !== undefined) {
      const affIdx = prerequisites.findIndex((p) => p.type === 'affinity')
      const affLabel =
        details.affinityLabel ?? `Character affinity level ${details.affinityLevel}`
      if (affIdx >= 0) {
        prerequisites[affIdx] = { type: 'affinity', label: affLabel }
      } else {
        prerequisites.push({ type: 'affinity', label: affLabel })
      }
    }

    if (details.otherRequirements) {
      const hasOther = prerequisites.some(
        (p) => p.type === 'other' && p.label === details.otherRequirements,
      )
      if (!hasOther) {
        prerequisites.push({ type: 'other', label: details.otherRequirements })
      }
    }

    return {
      ...item,
      region: details.region ?? item.region,
      subLocation: details.subLocation ?? item.subLocation,
      characters: details.characters.length > 0 ? details.characters : item.characters,
      affinityLevel: details.affinityLevel,
      timeOfDay: details.timeWindow ?? item.timeOfDay,
      affinityEffects: details.affinityEffects ?? item.affinityEffects,
      h2hIntro: details.intro ?? item.h2hIntro,
      h2hOutcomes: details.outcomes ?? item.h2hOutcomes,
      prerequisites,
    }
  })
}

async function fetchHeartToHearts(gameId: GameId): Promise<TrackableItem[]> {
  console.log('  Fetching heart-to-hearts')
  const items: TrackableItem[] = []
  const seen = new Set<string>()

  const listPages = await getPageWikitext(['Heart-to-Heart (XC1)'])
  const listPage = listPages[0]
  if (listPage?.wikitext) {
    const { headers } = parseWikitableWithHeaders(listPage.wikitext)
    const rows = parseAllWikitableWithHeaders(listPage.wikitext)
    const nameIdx = findHeaderIndex(headers, 'title', 'heart-to-heart', 'name')
    const areaIdx = findHeaderIndex(headers, 'area')
    const locIdx = findHeaderIndex(headers, 'location')
    const whoIdx = findHeaderIndex(headers, 'who', 'characters')
    const affIdx = findHeaderIndex(headers, 'affinity')
    const reqIdx = findHeaderIndex(headers, 'prerequisite', 'requirements', 'conditions')

    for (const row of rows) {
      const cells = row.cells
      const name = cells[nameIdx >= 0 ? nameIdx : 0]
      if (!name || name.toLowerCase().includes('title')) continue

      const prerequisites: TrackableItem['prerequisites'] = []
      const region = areaIdx >= 0 ? cells[areaIdx] : undefined
      const whoText = whoIdx >= 0 ? cells[whoIdx] : undefined
      const characters = whoText
        ? whoText.split(/\n/).map((l) => l.replace(/^\*\s*/, '').trim()).filter(Boolean)
        : undefined
      if (locIdx >= 0 && cells[locIdx]) {
        prerequisites.push({ type: 'area', label: cells[locIdx] })
      }
      if (affIdx >= 0 && cells[affIdx]) {
        prerequisites.push({ type: 'affinity', label: cells[affIdx] })
      }
      if (reqIdx >= 0 && cells[reqIdx]) {
        prerequisites.push({ type: 'other', label: cells[reqIdx] })
      }

      const id = makeId(gameId, 'heart_to_heart', name)
      if (!seen.has(id)) {
        seen.add(id)
        items.push({
          id,
          gameId,
          category: 'heart_to_heart',
          name,
          region,
          prerequisites,
          characters,
          wikiUrl: wikiPageUrl(name),
        })
      }
    }
  }

  return enrichHeartToHearts(items)
}

export async function fetchQuietMoments(gameId: GameId): Promise<TrackableItem[]> {
  console.log('  Fetching quiet moments (Future Connected)')
  const items: TrackableItem[] = []
  const seen = new Set<string>()

  const addPage = (
    page: { title: string; pageid?: number; wikitext?: string },
    regionFallback?: string,
  ) => {
    if (!page.wikitext) return
    if (/^Heart-to-Heart/i.test(page.title)) return

    const fields = parseGenericInfobox(page.wikitext)
    const name = fields.name || page.title
    if (/^Heart-to-Heart/i.test(name)) return

    const id = makeId(gameId, 'quiet_moment', name)
    if (seen.has(id)) return
    seen.add(id)

    const prerequisites = extractPrerequisites(fields, [
      'requirements',
      'conditions',
      'affinity',
    ])

    items.push({
      id,
      gameId,
      category: 'quiet_moment',
      name,
      region:
        fields.location || fields.area || regionFallback || "Bionis' Shoulder",
      characters: fields.characters
        ? parseListField(fields.characters)
        : undefined,
      prerequisites,
      wikiUrl: wikiPageUrl(page.title),
      wikiPageId: page.pageid,
    })
  }

  try {
    const pages = await getCategoryPagesRecursive(
      'XCFC_Quiet_Moments_by_Area',
      2,
    )
    for (const page of pages) {
      addPage(page)
    }
  } catch (err) {
    console.warn('  Warning: Could not fetch quiet moments by area:', err)
  }

  if (items.length === 0) {
    try {
      const pages = await getCategoryPagesRecursive(
        'XCFC_Quiet_Moments_by_Character',
        2,
      )
      for (const page of pages) {
        addPage(page)
      }
    } catch (err) {
      console.warn('  Warning: Could not fetch quiet moments by character:', err)
    }
  }

  if (items.length === 0) {
    try {
      const listPages = await getPageWikitext([
        'Quiet Moments (XC1FC)',
        'Quiet Moments',
      ])
      for (const listPage of listPages) {
        if (!listPage?.wikitext) continue
        const { headers, rows } = parseWikitableWithHeaders(listPage.wikitext)
        const nameIdx = findHeaderIndex(headers, 'title', 'name')
        const locIdx = findHeaderIndex(headers, 'location', 'area')
        const reqIdx = findHeaderIndex(headers, 'prerequisite', 'requirements')

        for (const row of rows) {
          const cells = row.cells
          const name = cells[nameIdx >= 0 ? nameIdx : 0]
          if (!name || /^Heart-to-Heart/i.test(name)) continue
          const id = makeId(gameId, 'quiet_moment', name)
          if (seen.has(id)) continue
          seen.add(id)

          const prerequisites: TrackableItem['prerequisites'] = []
          if (reqIdx >= 0 && cells[reqIdx]) {
            prerequisites.push({ type: 'other', label: cells[reqIdx] })
          }

          items.push({
            id,
            gameId,
            category: 'quiet_moment',
            name,
            region: locIdx >= 0 ? cells[locIdx] : "Bionis' Shoulder",
            prerequisites,
            wikiUrl: wikiPageUrl(name),
          })
        }
        if (items.length > 0) break
      }
    } catch (err) {
      console.warn('  Warning: Could not fetch quiet moments list:', err)
    }
  }

  console.log(`  Quiet moments found: ${items.length}`)
  return items
}

function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')
}

export async function ingestXC1(): Promise<void> {
  console.log('Ingesting XC1 data from Xenoblade Wiki...')

  const xc1Quests = await fetchQuests(XC1_QUEST_CATEGORIES, 'xc1')
  const xc1Monsters = await fetchUniqueMonsters('XC_Unique_Monsters', 'xc1')
  const xc1Achievements = await fetchAchievements('xc1')
  const xc1H2H = await fetchHeartToHearts('xc1')
  const xc1Items = await fetchXC1Items('xc1')
  const xc1Collectopaedia = await fetchXC1Collectopaedia('xc1')
  const xc1Landmarks = await fetchLandmarks('xc1')
  const xc1Colony6 = await fetchColony6Reconstruction('xc1')
  const xc1Immigrants = await fetchColony6Immigrants('xc1')

  const fcQuests = await fetchFCQuests('xc1-fc')
  let fcMonsters: TrackableItem[] = []
  try {
    fcMonsters = await fetchUniqueMonsters('XCFC_Unique_Monsters', 'xc1-fc')
  } catch {
    console.warn('  FC unique monsters category not found, skipping')
  }
  const fcQuietMoments = await fetchQuietMoments('xc1-fc')

  const xc1Dir = join(OUTPUT_DIR, 'xc1')
  const fcDir = join(OUTPUT_DIR, 'xc1-fc')

  writeJson(join(xc1Dir, 'quests.json'), xc1Quests)
  writeJson(join(xc1Dir, 'unique-monsters.json'), xc1Monsters)
  writeJson(join(xc1Dir, 'achievements.json'), xc1Achievements)
  writeJson(join(xc1Dir, 'heart-to-hearts.json'), xc1H2H)
  writeJson(join(xc1Dir, 'items.json'), xc1Items)
  writeJson(join(xc1Dir, 'collectopaedia.json'), xc1Collectopaedia)
  writeJson(join(xc1Dir, 'landmarks.json'), xc1Landmarks)
  writeJson(join(xc1Dir, 'colony-reconstruction.json'), xc1Colony6)
  writeJson(join(xc1Dir, 'colony-immigrants.json'), xc1Immigrants)

  writeJson(join(fcDir, 'quests.json'), fcQuests)
  writeJson(join(fcDir, 'unique-monsters.json'), fcMonsters)
  writeJson(join(fcDir, 'quiet-moments.json'), fcQuietMoments)

  let existingGames: DataManifest['games'] = {}
  try {
    const prev = JSON.parse(
      readFileSync(join(OUTPUT_DIR, 'manifest.json'), 'utf-8'),
    ) as DataManifest
    existingGames = prev.games ?? {}
  } catch {
    /* fresh manifest */
  }

  const manifest: DataManifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    attribution: 'Data from Xenoblade Wiki (CC BY-SA 3.0)',
    wikiBaseUrl: 'https://xenoblade.fandom.com',
    games: {
      ...existingGames,
      xc1: {
        name: 'Xenoblade Chronicles',
        categories: {
          quest: xc1Quests.length,
          unique_monster: xc1Monsters.length,
          achievement: xc1Achievements.length,
          heart_to_heart: xc1H2H.length,
          item: xc1Items.length,
          collectopaedia: xc1Collectopaedia.length,
          landmark: xc1Landmarks.length,
          colony_reconstruction: xc1Colony6.length,
          colony_immigrant: xc1Immigrants.length,
        },
      },
      'xc1-fc': {
        name: 'Future Connected',
        categories: {
          quest: fcQuests.length,
          unique_monster: fcMonsters.length,
          quiet_moment: fcQuietMoments.length,
        },
      },
    },
  }

  writeJson(join(OUTPUT_DIR, 'manifest.json'), manifest)

  console.log('\nIngestion complete:')
  console.log(`  XC1 Quests: ${xc1Quests.length}`)
  console.log(`  XC1 Unique Monsters: ${xc1Monsters.length}`)
  console.log(`  XC1 Achievements: ${xc1Achievements.length}`)
  console.log(`  XC1 Heart-to-Hearts: ${xc1H2H.length}`)
  console.log(`  XC1 Items: ${xc1Items.length}`)
  console.log(`  XC1 Collectopaedia sets: ${xc1Collectopaedia.length}`)
  console.log(`  XC1 Landmarks: ${xc1Landmarks.length}`)
  console.log(`  XC1 Colony 6 Reconstruction: ${xc1Colony6.length}`)
  console.log(`  XC1 Colony 6 Immigrants: ${xc1Immigrants.length}`)
  console.log(`  FC Quests: ${fcQuests.length}`)
  console.log(`  FC Unique Monsters: ${fcMonsters.length}`)
  console.log(`  FC Quiet Moments: ${fcQuietMoments.length}`)
}
