const STORAGE_KEY = 'xenoblade-new-available'

interface NewAvailableStore {
  newIds: string[]
  knownAvailable: string[]
  /** Once dismissed, never highlighted as NEW again. */
  seenIds: string[]
  primed: boolean
}

function loadStore(): NewAvailableStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { newIds: [], knownAvailable: [], seenIds: [], primed: false }
    const parsed = JSON.parse(raw) as Partial<NewAvailableStore>
    return {
      newIds: parsed.newIds ?? [],
      knownAvailable: parsed.knownAvailable ?? [],
      seenIds: parsed.seenIds ?? [],
      primed: parsed.primed ?? false,
    }
  } catch {
    return { newIds: [], knownAvailable: [], seenIds: [], primed: false }
  }
}

function saveStore(store: NewAvailableStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

/**
 * Diff currently available IDs against the last known set.
 * First non-empty sync only primes the baseline (no highlights).
 * IDs marked seen never reappear as NEW.
 */
export function syncNewlyAvailable(availableIds: string[]): string[] {
  if (availableIds.length === 0) {
    return loadStore().newIds
  }

  const store = loadStore()
  const availableSet = new Set(availableIds)
  const knownSet = new Set(store.knownAvailable)
  const seenSet = new Set(store.seenIds)

  if (!store.primed) {
    saveStore({
      newIds: [],
      knownAvailable: availableIds,
      seenIds: store.seenIds,
      primed: true,
    })
    return []
  }

  const newlyUnlocked = availableIds.filter(
    (id) => !knownSet.has(id) && !seenSet.has(id),
  )
  const stillNew = store.newIds.filter(
    (id) => availableSet.has(id) && !seenSet.has(id),
  )
  const mergedNew = [...new Set([...stillNew, ...newlyUnlocked])]

  saveStore({
    newIds: mergedNew,
    knownAvailable: availableIds,
    seenIds: store.seenIds,
    primed: true,
  })

  return mergedNew
}

export function getNewlyAvailableIds(): Set<string> {
  return new Set(loadStore().newIds)
}

export function markItemSeen(itemId: string): void {
  const store = loadStore()
  saveStore({
    ...store,
    newIds: store.newIds.filter((id) => id !== itemId),
    seenIds: store.seenIds.includes(itemId)
      ? store.seenIds
      : [...store.seenIds, itemId],
  })
}

export function countNewlyAvailableFor(
  itemIds: Iterable<string>,
  newIds: Set<string>,
): number {
  let count = 0
  for (const id of itemIds) {
    if (newIds.has(id)) count++
  }
  return count
}
