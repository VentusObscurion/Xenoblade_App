import type { GameId, TrackableItem } from '../../src/types/tracker.ts'
import { fetchFromWikiCategories } from './generic-fetch.ts'
import { parseGenericInfobox, slugify, stripWikiMarkup } from './parse-infobox.ts'
import { getCategoryPagesWithWikitext, wikiPageUrl } from './wiki-client.ts'

const XC2_COLLECT_TYPES = [
  'XC2_Mechanical',
  'XC2_Ore',
  'XC2_Fish',
  'XC2_Insect',
  'XC2_Vegetable',
  'XC2_Flower',
  'XC2_Tree',
]

const XC2_QUEST_LOCATIONS = [
  'Argentum_Trade_Guild_Quests',
  'Gormott_Province_Quests',
  'Kingdom_of_Uraya_Quests',
  'Empire_of_Mor_Ardain_Quests',
  'Temperantia_Quests',
  'Indoline_Praetorium_Quests',
  'Kingdom_of_Tantal_Quests',
  'Leftherian_Archipelago_Quests',
  'Cliffs_of_Morytha_Quests',
  'Land_of_Morytha_Quests',
  'World_Tree_Quests',
  'Blade_Quests',
  'XC2_DLC_Quests',
]

const XC2_H2H_AREAS = [
  'Argentum_Trade_Guild_Heart-to-Hearts',
  'Gormott_Province_Heart-to-Hearts',
  'Kingdom_of_Uraya_Heart-to-Hearts',
  'Empire_of_Mor_Ardain_Heart-to-Hearts',
  'Temperantia_Heart-to-Hearts',
  'Kingdom_of_Tantal_Heart-to-Hearts',
  'Leftherian_Archipelago_Heart-to-Hearts',
  'Spirit_Crucible_Elpys_Heart-to-Hearts',
  'Cliffs_of_Morytha_Heart-to-Hearts',
  'Land_of_Morytha_Heart-to-Hearts',
  'World_Tree_Heart-to-Hearts',
  'First_Low_Orbit_Station_Heart-to-Hearts',
  'XC2_DLC_Heart-to-Hearts',
]

function makeCollectId(gameId: GameId, name: string): string {
  return `${gameId}-collectopaedia-${slugify(name)}`
}

export async function fetchXC2Collectopaedia(gameId: GameId): Promise<TrackableItem[]> {
  console.log('  Fetching XC2 Collectopaedia (collectibles)')
  const items: TrackableItem[] = []
  const seen = new Set<string>()

  for (const category of XC2_COLLECT_TYPES) {
    const collectType = category.replace('XC2_', '').replace(/_/g, ' ')
    console.log(`    Category: ${category}`)
    try {
      const pages = await getCategoryPagesWithWikitext(category)
      for (const page of pages) {
        if (!page.wikitext) continue
        const fields = parseGenericInfobox(page.wikitext)
        const name = stripWikiMarkup(fields.name || page.title.replace(/ \(XC2\)$/, ''))
        const id = makeCollectId(gameId, name)
        if (seen.has(id)) continue
        seen.add(id)

        items.push({
          id,
          gameId,
          category: 'collectopaedia',
          name,
          region: fields.location || fields.area,
          prerequisites: [],
          description: fields.description,
          wikiUrl: wikiPageUrl(page.title),
          wikiPageId: page.pageid,
          collectType,
          rarity: fields.rarity,
        })
      }
    } catch (err) {
      console.warn(`    Warning: ${category}:`, err)
    }
  }

  return items
}

export async function fetchXC2Quests(gameId: GameId): Promise<TrackableItem[]> {
  console.log('  Fetching XC2 quests')
  return fetchFromWikiCategories({
    gameId,
    category: 'quest',
    wikiCategories: XC2_QUEST_LOCATIONS,
    titleSuffix: / \(XC2\)$/i,
  })
}

export async function fetchXC2UniqueMonsters(gameId: GameId): Promise<TrackableItem[]> {
  console.log('  Fetching XC2 unique monsters')
  return fetchFromWikiCategories({
    gameId,
    category: 'unique_monster',
    wikiCategories: ['XC2_Unique_Monsters'],
    recursive: false,
    regionFromCategory: false,
    titleSuffix: / \(XC2\)$/i,
  })
}

export async function fetchXC2HeartToHearts(gameId: GameId): Promise<TrackableItem[]> {
  console.log('  Fetching XC2 heart-to-hearts')
  return fetchFromWikiCategories({
    gameId,
    category: 'heart_to_heart',
    wikiCategories: XC2_H2H_AREAS,
    titleSuffix: / \(XC2\)$/i,
  })
}

export async function fetchXC2Blades(gameId: GameId): Promise<TrackableItem[]> {
  console.log('  Fetching XC2 blades')
  return fetchFromWikiCategories({
    gameId,
    category: 'blade',
    wikiCategories: ['XC2_Blades'],
    recursive: false,
    regionFromCategory: false,
    titleSuffix: / \(XC2\)$/i,
    skipTitle: /^(Blade|Aegis|List of)\b/i,
  })
}
