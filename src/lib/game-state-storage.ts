import {
  DEFAULT_GAME_STATE,
  normalizeGameState,
  type GameState,
} from '../types/game-state.ts'
import type { GameId } from '../types/tracker.ts'

export const GAME_STATE_STORAGE_KEY = 'xenoblade-game-state'

export type StoredGameStates = Partial<Record<GameId, GameState>>

export function loadAllGameStates(): StoredGameStates {
  try {
    const raw = localStorage.getItem(GAME_STATE_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredGameStates) : {}
  } catch {
    return {}
  }
}

export function saveGameStateForGame(gameId: GameId, state: GameState): void {
  const all = loadAllGameStates()
  all[gameId] = state
  localStorage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(all))
}

export function exportGameStates(): StoredGameStates {
  return loadAllGameStates()
}

export function importGameStates(states: StoredGameStates | undefined): number {
  if (!states || typeof states !== 'object') return 0
  const next: StoredGameStates = {}
  let count = 0
  for (const [gameId, state] of Object.entries(states) as Array<
    [GameId, GameState | undefined]
  >) {
    if (!state) continue
    next[gameId] = normalizeGameState(state)
    count++
  }
  localStorage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(next))
  return count
}

export function clearAllGameStates(): void {
  localStorage.removeItem(GAME_STATE_STORAGE_KEY)
}

export function getGameState(gameId: GameId): GameState {
  const all = loadAllGameStates()
  return normalizeGameState(all[gameId] ?? DEFAULT_GAME_STATE)
}
