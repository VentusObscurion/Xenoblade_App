import type { Category, GameId, TrackableItem } from '../../src/types/tracker.ts'
import {
  extractPrerequisites,
  parseGenericInfobox,
  parseLevel,
  slugify,
  stripWikiMarkup,
} from './parse-infobox.ts'
import {
  getCategoryPagesRecursive,
  getCategoryPagesWithWikitext,
  imageUrlFromInfobox,
  wikiPageUrl,
} from './wiki-client.ts'

const SKIP_TITLE =
  /^(Quest|Unique Monster|Heart-to-Heart|Blade|Hero|Main Story Quest|Collectopaedia|List of)\b/i

export function makeTrackableId(
  gameId: GameId,
  category: Category,
  name: string,
): string {
  return `${gameId}-${category}-${slugify(name)}`
}

function cleanTitle(title: string, gameSuffix?: RegExp): string {
  let name = title
  if (gameSuffix) name = name.replace(gameSuffix, '')
  return stripWikiMarkup(name).trim()
}

export async function fetchFromWikiCategories(options: {
  gameId: GameId
  category: Category
  wikiCategories: string[]
  recursive?: boolean
  regionFromCategory?: boolean
  titleSuffix?: RegExp
  skipTitle?: RegExp
}): Promise<TrackableItem[]> {
  const {
    gameId,
    category,
    wikiCategories,
    recursive = true,
    regionFromCategory = true,
    titleSuffix,
    skipTitle = SKIP_TITLE,
  } = options

  const items: TrackableItem[] = []
  const seen = new Set<string>()

  for (const wikiCategory of wikiCategories) {
    console.log(`    ${category}: ${wikiCategory}`)
    const regionGuess = regionFromCategory
      ? wikiCategory
          .replace(/_/g, ' ')
          .replace(/\s+Quests$/i, '')
          .replace(/\s+Unique Monsters$/i, '')
          .replace(/\s+Heart-to-Hearts$/i, '')
          .replace(/^XC\d+\s*/i, '')
          .replace(/^TTGC\s*/i, '')
          .replace(/^XC3FR\s*/i, '')
          .trim()
      : undefined

    try {
      const pages = recursive
        ? await getCategoryPagesRecursive(wikiCategory, 2)
        : await getCategoryPagesWithWikitext(wikiCategory)

      for (const page of pages) {
        if (!page.wikitext) continue
        if (skipTitle.test(page.title)) continue

        const fields = parseGenericInfobox(page.wikitext)
        const name = cleanTitle(fields.name || page.title, titleSuffix)
        if (!name || skipTitle.test(name)) continue

        const id = makeTrackableId(gameId, category, name)
        if (seen.has(id)) continue
        seen.add(id)

        const prerequisites = extractPrerequisites(fields, [
          'prerequisites',
          'requirements',
          'conditions',
          'affinity',
        ])

        const level =
          parseLevel(fields.level) ??
          parseLevel(fields.recommendedlevel) ??
          undefined

        items.push({
          id,
          gameId,
          category,
          name,
          region: fields.location || fields.area || regionGuess,
          level,
          prerequisites,
          description: fields.description,
          giver: fields.giver || fields.client,
          wikiUrl: wikiPageUrl(page.title),
          wikiPageId: page.pageid,
          imageUrl: imageUrlFromInfobox(fields),
          element: fields.element,
          weaponClass: fields.weapon || fields.class,
          role: fields.role,
          rarity: fields.rarity,
          collectType: fields.type || fields.category,
        })
      }
    } catch (err) {
      console.warn(`    Warning: ${wikiCategory}:`, err)
    }
  }

  return items
}
