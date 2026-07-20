import { useEffect, useMemo, useState } from 'react'
import { loadGameData } from '../lib/game-data.ts'
import type {
  Category,
  DataManifest,
  GameId,
  TrackableItem,
} from '../types/tracker.ts'

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
        const data = await loadGameData(gameId)
        if (cancelled) return
        setItems(data.byCategory.get(category) ?? [])
        setAllGameItems(data.allItems)
        setManifest(data.manifest)
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
