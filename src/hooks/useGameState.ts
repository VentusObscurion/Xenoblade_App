import { useCallback, useEffect, useState } from 'react'
import {
  getGameState,
  saveGameStateForGame,
} from '../lib/game-state-storage.ts'
import {
  characterPairKey,
  type GameState,
} from '../types/game-state.ts'
import type { GameId } from '../types/tracker.ts'

export function useGameState(gameId: GameId) {
  const [gameState, setGameState] = useState<GameState>(() => getGameState(gameId))

  useEffect(() => {
    setGameState(getGameState(gameId))
  }, [gameId])

  const update = useCallback(
    (updater: (prev: GameState) => GameState) => {
      setGameState((prev) => {
        const next = updater(prev)
        saveGameStateForGame(gameId, next)
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
        const partyMembers = [...members].sort()
        const partyLeader = partyMembers.includes(prev.partyLeader)
          ? prev.partyLeader
          : partyMembers[0] ?? 'Shulk'
        return { ...prev, partyMembers, partyLeader }
      }),
    [update],
  )

  const setPartyLeader = useCallback(
    (character: string) =>
      update((prev) => ({
        ...prev,
        partyLeader: prev.partyMembers.includes(character)
          ? character
          : prev.partyLeader,
      })),
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

  const setStoryFlag = useCallback(
    (flagId: string, value: boolean) =>
      update((prev) => ({
        ...prev,
        storyFlags: { ...prev.storyFlags, [flagId]: value },
      })),
    [update],
  )

  const setColony6Reconstruction = useCallback(
    (percent: number) =>
      update((prev) => ({
        ...prev,
        colony6Reconstruction: Math.max(0, Math.min(100, percent)),
        storyFlags: {
          ...prev.storyFlags,
          colony6_reconstruction_started:
            percent > 0 ? true : prev.storyFlags.colony6_reconstruction_started,
        },
      })),
    [update],
  )

  const reloadFromStorage = useCallback(() => {
    setGameState(getGameState(gameId))
  }, [gameId])

  return {
    gameState,
    setPlayerLevel,
    setAreaAffinity,
    setAreaDiscovered,
    setPartyMember,
    setPartyLeader,
    setCharacterAffinity,
    setStoryFlag,
    setColony6Reconstruction,
    reloadFromStorage,
  }
}
