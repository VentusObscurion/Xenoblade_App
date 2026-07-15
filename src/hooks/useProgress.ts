import { useCallback, useEffect, useState } from 'react'
import {
  exportProgress,
  getAllProgress,
  importProgress,
  setProgress,
  toggleProgress,
} from '../lib/progress-db.ts'
import type { ProgressEntry } from '../types/tracker.ts'

export function useProgress() {
  const [progress, setProgressState] = useState<Record<string, ProgressEntry>>({})
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const all = await getAllProgress()
    setProgressState(all)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const toggle = useCallback(
    async (itemId: string) => {
      const entry = await toggleProgress(itemId)
      setProgressState((prev) => ({ ...prev, [itemId]: entry }))
    },
    [],
  )

  const updateNotes = useCallback(async (itemId: string, notes: string) => {
    const existing = progress[itemId]
    const entry: ProgressEntry = {
      itemId,
      completed: existing?.completed ?? false,
      completedAt: existing?.completedAt,
      notes,
    }
    await setProgress(entry)
    setProgressState((prev) => ({ ...prev, [itemId]: entry }))
  }, [progress])

  const exportData = useCallback(async () => {
    return exportProgress()
  }, [])

  const importData = useCallback(async (json: string) => {
    const count = await importProgress(json)
    await refresh()
    return count
  }, [refresh])

  return {
    progress,
    loading,
    toggle,
    updateNotes,
    exportData,
    importData,
    refresh,
  }
}
