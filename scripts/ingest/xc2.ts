import type { GameId, TrackableItem } from '../../src/types/tracker.ts'
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

function makeId(gameId: GameId, name: string): string {
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
        const id = makeId(gameId, name)
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
