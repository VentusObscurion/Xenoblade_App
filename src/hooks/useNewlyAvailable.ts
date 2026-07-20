import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getNewlyAvailableIds,
  markItemSeen,
  syncNewlyAvailable,
} from '../lib/new-available.ts'

export function useNewlyAvailable(availableIds: string[]) {
  const key = useMemo(() => [...availableIds].sort().join('|'), [availableIds])
  const [newIds, setNewIds] = useState<Set<string>>(() => getNewlyAvailableIds())

  useEffect(() => {
    const synced = syncNewlyAvailable(availableIds)
    setNewIds(new Set(synced))
  }, [key, availableIds])

  const markSeen = useCallback((itemId: string) => {
    markItemSeen(itemId)
    setNewIds(getNewlyAvailableIds())
  }, [])

  return { newIds, markSeen }
}
