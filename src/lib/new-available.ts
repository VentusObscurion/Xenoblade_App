const STORAGE_KEY = 'xenoblade-new-available'

interface NewAvailableStore {
  newIds: string[]
  knownAvailable: string[]
  primed: boolean
}

function loadStore(): NewAvailableStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { newIds: [], knownAvailable: [], primed: false }
    const parsed = JSON.parse(raw) as Partial<NewAvailableStore>
    return {
      newIds: parsed.newIds ?? [],
      knownAvailable: parsed.knownAvailable ?? [],
      primed: parsed.primed ?? false,
    }
  } catch {
    return { newIds: [], knownAvailable: [], primed: false }
  }
}

function saveStore(store: NewAvailableStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

/**
 * Diff currently available IDs against the last known set.
 * First non-empty sync only primes the baseline (no highlights).
 */
export function syncNewlyAvailable(availableIds: string[]): string[] {
  if (availableIds.length === 0) {
    return loadStore().newIds
  }

  const store = loadStore()
  const availableSet = new Set(availableIds)
  const knownSet = new Set(store.knownAvailable)

  if (!store.primed) {
    saveStore({
      newIds: [],
      knownAvailable: availableIds,
      primed: true,
    })
    return []
  }

  const newlyUnlocked = availableIds.filter((id) => !knownSet.has(id))
  const stillNew = store.newIds.filter((id) => availableSet.has(id))
  const mergedNew = [...new Set([...stillNew, ...newlyUnlocked])]

  saveStore({
    newIds: mergedNew,
    knownAvailable: availableIds,
    primed: true,
  })

  return mergedNew
}

export function getNewlyAvailableIds(): Set<string> {
  return new Set(loadStore().newIds)
}

export function markItemSeen(itemId: string): void {
  const store = loadStore()
  if (!store.newIds.includes(itemId)) return
  saveStore({
    ...store,
    newIds: store.newIds.filter((id) => id !== itemId),
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
