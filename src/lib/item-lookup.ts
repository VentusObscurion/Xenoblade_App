import type { TrackableItem } from '../types/tracker.ts'

function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ \(xc1\)$/i, '')
    .replace(/['']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildItemLookup(items: TrackableItem[]): Map<string, TrackableItem> {
  const lookup = new Map<string, TrackableItem>()
  for (const item of items) {
    if (item.category !== 'item') continue
    lookup.set(normalizeItemName(item.name), item)
  }
  return lookup
}

export function findItemByName(
  lookup: Map<string, TrackableItem>,
  name: string,
): TrackableItem | undefined {
  return lookup.get(normalizeItemName(name))
}
