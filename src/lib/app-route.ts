import type { Category, GameId } from '../types/tracker.ts'
import { GAME_CATEGORIES, GAMES } from '../types/tracker.ts'

export type AppView = 'dashboard' | 'tracker' | 'playthrough' | 'settings'

export interface AppRoute {
  gameId: GameId
  view: AppView
  category?: Category
}

const VALID_VIEWS = new Set<AppView>([
  'dashboard',
  'tracker',
  'playthrough',
  'settings',
])

function isGameId(value: string): value is GameId {
  return GAMES.some((g) => g.id === value)
}

function parseHash(hash: string): AppRoute | null {
  const raw = hash.replace(/^#\/?/, '').trim()
  if (!raw) return null
  const parts = raw.split('/').filter(Boolean)
  if (parts.length === 0) return null

  const gameId = parts[0]
  if (!isGameId(gameId)) return null

  const viewPart = parts[1] ?? 'dashboard'
  if (!VALID_VIEWS.has(viewPart as AppView)) return null
  const view = viewPart as AppView

  if (view === 'playthrough' && gameId !== 'xc1') {
    return { gameId, view: 'dashboard' }
  }

  let category: Category | undefined
  if (view === 'tracker' && parts[2]) {
    const cats = GAME_CATEGORIES[gameId]
    if (cats.includes(parts[2] as Category)) {
      category = parts[2] as Category
    }
  }

  return { gameId, view, category }
}

export function readAppRoute(): AppRoute {
  const fromHash = parseHash(window.location.hash)
  if (fromHash) return fromHash
  return { gameId: 'xc1', view: 'dashboard' }
}

export function writeAppRoute(route: AppRoute): void {
  const parts: string[] = [route.gameId, route.view]
  if (route.view === 'tracker' && route.category) {
    parts.push(route.category)
  }
  const next = `#/${parts.join('/')}`
  if (window.location.hash !== next) {
    window.history.replaceState(null, '', next)
  }
}
