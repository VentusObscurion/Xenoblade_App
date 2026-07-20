import { getCategoryFile } from '../lib/data-files.ts'
import { isValidTrackableItem } from '../lib/item-filters.ts'
import { resolveQuestReferences } from '../lib/prerequisites.ts'
import { sanitizeItem } from '../lib/sanitize-item.ts'
import type {
  Category,
  DataManifest,
  GameId,
  TrackableItem,
} from '../types/tracker.ts'
import { GAME_CATEGORIES } from '../types/tracker.ts'

/** Categories needed for lookups even if not shown as tabs. */
function categoriesToLoad(gameId: GameId): Category[] {
  const cats = [...GAME_CATEGORIES[gameId]]
  if (gameId === 'xc1' && cats.includes('collectopaedia') && !cats.includes('item')) {
    cats.push('item')
  }
  if (gameId === 'xc1' && cats.includes('colony_reconstruction')) {
    cats.push('colony_immigrant')
  }
  return cats
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url)
  if (!response.ok) return null
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return null
  return response.json() as Promise<T>
}

async function loadCategory(
  gameId: GameId,
  category: Category,
): Promise<TrackableItem[]> {
  const file = getCategoryFile(category)
  if (!file) return []

  const base = import.meta.env.BASE_URL
  const data = await fetchJson<TrackableItem[]>(`${base}data/${gameId}/${file}`)
  if (!data) return []

  return resolveQuestReferences(
    data
      .map(sanitizeItem)
      .filter((item) =>
        isValidTrackableItem(item.name, item.category, item.level, item.region),
      ),
  )
}

async function loadManifest(): Promise<DataManifest | null> {
  const base = import.meta.env.BASE_URL
  return fetchJson<DataManifest>(`${base}data/manifest.json`)
}

interface GameDataCache {
  byCategory: Map<Category, TrackableItem[]>
  allItems: TrackableItem[]
  manifest: DataManifest | null
}

const cache = new Map<GameId, Promise<GameDataCache>>()

export async function loadGameData(gameId: GameId): Promise<GameDataCache> {
  const existing = cache.get(gameId)
  if (existing) return existing

  const promise = (async (): Promise<GameDataCache> => {
    const categories = categoriesToLoad(gameId)
    const [manifest, ...loaded] = await Promise.all([
      loadManifest(),
      ...categories.map((c) => loadCategory(gameId, c)),
    ])

    const byCategory = new Map<Category, TrackableItem[]>()
    categories.forEach((category, index) => {
      byCategory.set(category, loaded[index] ?? [])
    })

    return {
      byCategory,
      allItems: loaded.flat(),
      manifest,
    }
  })()

  cache.set(gameId, promise)
  try {
    return await promise
  } catch (err) {
    cache.delete(gameId)
    throw err
  }
}

export function clearGameDataCache(gameId?: GameId): void {
  if (gameId) cache.delete(gameId)
  else cache.clear()
}
