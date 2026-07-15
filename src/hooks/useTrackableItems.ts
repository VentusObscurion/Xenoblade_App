import { useEffect, useMemo, useState } from 'react'
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

async function loadCategory(
  gameId: GameId,
  category: Category,
): Promise<TrackableItem[]> {
  const file = getCategoryFile(category)
  if (!file) return []

  const base = import.meta.env.BASE_URL
  const url = `${base}data/${gameId}/${file}`
  const response = await fetch(url)
  if (!response.ok) return []

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return []

  const data = (await response.json()) as TrackableItem[]
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
  const response = await fetch(`${base}data/manifest.json`)
  if (!response.ok) return null

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return null

  return response.json() as Promise<DataManifest>
}

export function useTrackableItems(gameId: GameId, category: Category) {
  const [items, setItems] = useState<TrackableItem[]>([])
  const [allGameItems, setAllGameItems] = useState<TrackableItem[]>([])
  const [manifest, setManifest] = useState<DataManifest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [categoryItems, manifestData] = await Promise.all([
          loadCategory(gameId, category),
          loadManifest(),
        ])

        const gameCategories = GAME_CATEGORIES[gameId]
        const allItems = (
          await Promise.all(gameCategories.map((c) => loadCategory(gameId, c)))
        ).flat()

        if (!cancelled) {
          setItems(categoryItems)
          setAllGameItems(allItems)
          setManifest(manifestData)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [gameId, category])

  const regions = useMemo(() => {
    const set = new Set(items.map((i) => i.region).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [items])

  return { items, allGameItems, manifest, regions, loading, error }
}
