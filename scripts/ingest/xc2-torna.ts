import type { GameId, TrackableItem } from '../../src/types/tracker.ts'
import { fetchFromWikiCategories } from './generic-fetch.ts'
import { parseGenericInfobox, slugify, stripWikiMarkup } from './parse-infobox.ts'
import { getCategoryPagesWithWikitext, wikiPageUrl } from './wiki-client.ts'

const TORNA_QUEST_CATS = [
  'Kingdom_of_Torna_Quests',
  'Gormott_Quests',
  'TTGC_Main_Story_Quests',
]

const TORNA_COLLECT_TYPES = [
  'TTGC_Vegetable',
  'TTGC_Fruit',
  'TTGC_Flower',
  'TTGC_Animal',
  'TTGC_Ore',
  'TTGC_Treasure',
]

export async function fetchTornaQuests(gameId: GameId): Promise<TrackableItem[]> {
  console.log('  Fetching Torna quests')
  return fetchFromWikiCategories({
    gameId,
    category: 'quest',
    wikiCategories: TORNA_QUEST_CATS,
    titleSuffix: / \(TTGC\)$/i,
  })
}

export async function fetchTornaUniqueMonsters(
  gameId: GameId,
): Promise<TrackableItem[]> {
  console.log('  Fetching Torna unique monsters')
  return fetchFromWikiCategories({
    gameId,
    category: 'unique_monster',
    wikiCategories: ['TTGC_Unique_Monsters'],
    recursive: false,
    regionFromCategory: false,
    titleSuffix: / \(TTGC\)$/i,
  })
}

export async function fetchTornaCollectopaedia(
  gameId: GameId,
): Promise<TrackableItem[]> {
  console.log('  Fetching Torna collectopaedia')
  const items: TrackableItem[] = []
  const seen = new Set<string>()

  for (const category of TORNA_COLLECT_TYPES) {
    const collectType = category.replace('TTGC_', '').replace(/_/g, ' ')
    try {
      const pages = await getCategoryPagesWithWikitext(category)
      for (const page of pages) {
        if (!page.wikitext) continue
        const fields = parseGenericInfobox(page.wikitext)
        const name = stripWikiMarkup(
          fields.name || page.title.replace(/ \(TTGC\)$/, ''),
        )
        const id = `${gameId}-collectopaedia-${slugify(name)}`
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
