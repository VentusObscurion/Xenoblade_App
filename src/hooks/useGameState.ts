import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_GAME_STATE,
  normalizeGameState,
  characterPairKey,
  type GameState,
} from '../types/game-state.ts'
import type { GameId } from '../types/tracker.ts'

const STORAGE_KEY = 'xenoblade-game-state'

function loadAll(): Partial<Record<GameId, GameState>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<Record<GameId, GameState>>) : {}
  } catch {
    return {}
  }
}

function saveForGame(gameId: GameId, state: GameState): void {
  const all = loadAll()
  all[gameId] = state
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function useGameState(gameId: GameId) {
  const [gameState, setGameState] = useState<GameState>(DEFAULT_GAME_STATE)

  useEffect(() => {
    const all = loadAll()
    setGameState(normalizeGameState(all[gameId]))
  }, [gameId])

  const update = useCallback(
    (updater: (prev: GameState) => GameState) => {
      setGameState((prev) => {
        const next = updater(prev)
        saveForGame(gameId, next)
        return next
      })
    },
    [gameId],
  )

  const setPlayerLevel = useCallback(
    (level: number) =>
      update((prev) => ({ ...prev, playerLevel: Math.max(1, level) })),
    [update],
  )

  const setAreaAffinity = useCallback(
    (area: string, stars: number) =>
      update((prev) => ({
        ...prev,
        areaAffinity: { ...prev.areaAffinity, [area]: stars },
      })),
    [update],
  )

  const setAreaDiscovered = useCallback(
    (area: string, discovered: boolean) =>
      update((prev) => ({
        ...prev,
        discoveredAreas: { ...prev.discoveredAreas, [area]: discovered },
      })),
    [update],
  )

  const setPartyMember = useCallback(
    (character: string, inParty: boolean) =>
      update((prev) => {
        const members = new Set(prev.partyMembers)
        if (inParty) members.add(character)
        else members.delete(character)
        return { ...prev, partyMembers: [...members].sort() }
      }),
    [update],
  )

  const setCharacterAffinity = useCallback(
    (charA: string, charB: string, level: number) =>
      update((prev) => ({
        ...prev,
        characterAffinity: {
          ...prev.characterAffinity,
          [characterPairKey(charA, charB)]: Math.max(0, Math.min(5, level)),
        },
      })),
    [update],
  )

  return {
    gameState,
    setPlayerLevel,
    setAreaAffinity,
    setAreaDiscovered,
    setPartyMember,
    setCharacterAffinity,
  }
}
