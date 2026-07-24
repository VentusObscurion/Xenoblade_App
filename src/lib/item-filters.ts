import type { Category } from '../types/tracker.ts'
import type { SortMode } from '../components/FilterBar.tsx'

export function getDefaultSortMode(category: Category): SortMode {
  if (category === 'quest' || category === 'person') return 'region'
  if (category === 'unique_monster') return 'level'
  return 'name'
}

export function isValidTrackableItem(
  name: string,
  category: string,
  level?: number,
  region?: string,
): boolean {
  if (category === 'quest' && / Quests$/i.test(name)) return false
  if (category === 'unique_monster') {
    if (/ Unique Monsters$/i.test(name)) return false
    if (level === undefined && !region) return false
  }
  if (category === 'landmark' && /^Secret Area$/i.test(name)) return false
  return true
}
