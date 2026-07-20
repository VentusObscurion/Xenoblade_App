import type { GameId, TrackableItem } from '../../src/types/tracker.ts'
import { fetchFromWikiCategories } from './generic-fetch.ts'
import { getCategoryPagesRecursive } from './wiki-client.ts'
import { parseGenericInfobox, slugify, stripWikiMarkup } from './parse-infobox.ts'
import { wikiPageUrl } from './wiki-client.ts'

export async function fetchXC3Quests(gameId: GameId): Promise<TrackableItem[]> {
  console.log('  Fetching XC3 quests')
  return fetchFromWikiCategories({
    gameId,
    category: 'quest',
    wikiCategories: ['XC3_Quests'],
    recursive: true,
    titleSuffix: / \(XC3\)$/i,
  })
}

export async function fetchXC3UniqueMonsters(
  gameId: GameId,
): Promise<TrackableItem[]> {
  console.log('  Fetching XC3 unique monsters')
  return fetchFromWikiCategories({
    gameId,
    category: 'unique_monster',
    wikiCategories: ['XC3_Unique_Monsters'],
    recursive: false,
    regionFromCategory: false,
    titleSuffix: / \(XC3\)$/i,
  })
}

export async function fetchXC3Heroes(gameId: GameId): Promise<TrackableItem[]> {
  console.log('  Fetching XC3 heroes')
  return fetchFromWikiCategories({
    gameId,
    category: 'hero',
    wikiCategories: ['XC3_Heroes'],
    recursive: false,
    regionFromCategory: false,
    titleSuffix: / \(XC3\)$/i,
    skipTitle: /^(Hero|List of)\b/i,
  })
}

export async function fetchXC3Collectopaedia(
  gameId: GameId,
): Promise<TrackableItem[]> {
  console.log('  Fetching XC3 collectopaedia (best-effort categories)')
  // XC3 collectibles are often listed under Collectopaedia / Collectibles pages.
  try {
    const pages = await getCategoryPagesRecursive('XC3_Collectibles', 2)
    const items: TrackableItem[] = []
    const seen = new Set<string>()
    for (const page of pages) {
      if (!page.wikitext) continue
      if (/^(Collectopaedia|List of|Collectible)\b/i.test(page.title)) continue
      const fields = parseGenericInfobox(page.wikitext)
      const name = stripWikiMarkup(
        fields.name || page.title.replace(/ \(XC3\)$/, ''),
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
        collectType: fields.type,
        rarity: fields.rarity,
      })
    }
    return items
  } catch (err) {
    console.warn('    XC3 collectopaedia unavailable:', err)
    return []
  }
}

export async function fetchFRQuests(gameId: GameId): Promise<TrackableItem[]> {
  console.log('  Fetching Future Redeemed quests')
  return fetchFromWikiCategories({
    gameId,
    category: 'quest',
    wikiCategories: ['XC3FR_Quests', 'Future_Redeemed_Quests'],
    recursive: true,
    titleSuffix: / \((XC3FR|FR)\)$/i,
  })
}

export async function fetchFRUniqueMonsters(
  gameId: GameId,
): Promise<TrackableItem[]> {
  console.log('  Fetching Future Redeemed unique monsters')
  return fetchFromWikiCategories({
    gameId,
    category: 'unique_monster',
    wikiCategories: ['XC3FR_Unique_Monsters'],
    recursive: false,
    regionFromCategory: false,
    titleSuffix: / \((XC3FR|FR)\)$/i,
  })
}

export async function fetchFRCollectopaedia(
  gameId: GameId,
): Promise<TrackableItem[]> {
  console.log('  Fetching Future Redeemed collectopaedia')
  try {
    const pages = await getCategoryPagesRecursive('XC3FR_Collectibles', 2)
    const items: TrackableItem[] = []
    const seen = new Set<string>()
    for (const page of pages) {
      if (!page.wikitext) continue
      if (/^(Collectopaedia|List of|Collectible)\b/i.test(page.title)) continue
      const fields = parseGenericInfobox(page.wikitext)
      const name = stripWikiMarkup(
        fields.name || page.title.replace(/ \((XC3FR|FR)\)$/, ''),
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
        collectType: fields.type,
        rarity: fields.rarity,
      })
    }
    return items
  } catch (err) {
    console.warn('    FR collectopaedia unavailable:', err)
    return []
  }
}
