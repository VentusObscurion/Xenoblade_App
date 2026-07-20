import { useMemo } from 'react'
import { useGameState } from '../hooks/useGameState.ts'
import { useNewlyAvailable } from '../hooks/useNewlyAvailable.ts'
import { useProgress } from '../hooks/useProgress.ts'
import { useTrackableItems } from '../hooks/useTrackableItems.ts'
import { collectAvailableItemIds } from '../lib/available-ids.ts'
import { collectopaediaSlotId } from '../lib/collectopaedia.ts'
import { isColony6NextLevelMaterial } from '../lib/colony6-availability.ts'
import { getAllColony6Levels } from '../lib/colony6-levels.ts'
import { isH2HAvailable } from '../lib/h2h-availability.ts'
import { filterAvailableQuests } from '../lib/quest-ordering.ts'
import { isItemAvailable } from '../lib/prerequisites.ts'
import { filterByDiscoveredRegions } from '../lib/region-discovery.ts'
import type { Category, GameId } from '../types/tracker.ts'
import { CATEGORY_LABELS, GAME_CATEGORIES } from '../types/tracker.ts'

interface DashboardPageProps {
  gameId: GameId
  onNavigate: (category: Category) => void
}

interface CategorySummary {
  category: Category
  label: string
  total: number
  completed: number
  available: number
  open: number
  newlyAvailable: number
}

export function DashboardPage({ gameId, onNavigate }: DashboardPageProps) {
  const categories = GAME_CATEGORIES[gameId]
  const primaryCategory = categories[0]
  const { allGameItems, loading, error } = useTrackableItems(gameId, primaryCategory)
  const { progress } = useProgress()
  const { gameState } = useGameState(gameId)

  const availableIds = useMemo(
    () => collectAvailableItemIds(allGameItems, progress, gameState),
    [allGameItems, progress, gameState],
  )
  const { newIds } = useNewlyAvailable(availableIds)

  const summaries = useMemo((): CategorySummary[] => {
    const allQuests = allGameItems.filter((i) => i.category === 'quest')

    return categories.map((category) => {
      const items = allGameItems.filter((i) => i.category === category)
      let total = items.length
      let completed = items.filter((i) => progress[i.id]?.completed).length

      if (category === 'collectopaedia' && gameId === 'xc1') {
        total = 0
        completed = 0
        for (const item of items) {
          item.collectopaediaSlots?.forEach((slot, index) => {
            if (!slot) return
            total++
            if (progress[collectopaediaSlotId(item.id, index)]?.completed) completed++
          })
        }
      }

      const visible =
        category === 'colony_reconstruction' || category === 'collectopaedia'
          ? items
          : filterByDiscoveredRegions(items, gameState)
      const open = visible.filter((i) => !progress[i.id]?.completed).length

      let available = open
      if (category === 'quest') {
        available = filterAvailableQuests(
          visible.filter((i) => !progress[i.id]?.completed),
          allQuests,
          progress,
          gameState,
        ).length
      } else if (category === 'heart_to_heart') {
        available = visible.filter((i) => isH2HAvailable(i, progress, gameState)).length
      } else if (category === 'unique_monster') {
        available = visible.filter(
          (i) =>
            !progress[i.id]?.completed &&
            isItemAvailable(i, progress, allGameItems, gameState),
        ).length
      } else if (category === 'colony_reconstruction') {
        const materials = allGameItems.filter(
          (i) => i.category === 'colony_reconstruction',
        )
        const levels = getAllColony6Levels(materials, progress)
        available = items.filter(
          (i) =>
            !progress[i.id]?.completed &&
            isColony6NextLevelMaterial(i, levels, gameState),
        ).length
      }

      const newlyAvailable = items.filter((i) => newIds.has(i.id)).length

      return {
        category,
        label: CATEGORY_LABELS[category],
        total,
        completed,
        available,
        open,
        newlyAvailable,
      }
    })
  }, [allGameItems, categories, gameId, gameState, progress, newIds])

  if (loading) {
    return <p className="loading">Loading dashboard...</p>
  }

  if (error) {
    return <p className="error">Error: {error}</p>
  }

  const totalCompleted = summaries.reduce((sum, s) => sum + s.completed, 0)
  const totalItems = summaries.reduce((sum, s) => sum + s.total, 0)
  const totalAvailable = summaries.reduce((sum, s) => sum + s.available, 0)
  const totalNew = summaries.reduce((sum, s) => sum + s.newlyAvailable, 0)

  return (
    <div className="dashboard">
      <h2>Playthrough Overview</h2>
      <p className="dashboard-intro">
        Based on your current level, discovered areas, party, and affinities.
      </p>

      <div className="dashboard-stats">
        <div className="dashboard-stat">
          <span className="dashboard-stat-value">{totalCompleted}</span>
          <span className="dashboard-stat-label">Completed</span>
        </div>
        <div className="dashboard-stat">
          <span className="dashboard-stat-value">{totalAvailable}</span>
          <span className="dashboard-stat-label">Available now</span>
        </div>
        {totalNew > 0 && (
          <div className="dashboard-stat">
            <span className="dashboard-stat-value dashboard-stat-new">+{totalNew}</span>
            <span className="dashboard-stat-label">Newly unlocked</span>
          </div>
        )}
        <div className="dashboard-stat">
          <span className="dashboard-stat-value">
            {totalCompleted}/{totalItems}
          </span>
          <span className="dashboard-stat-label">Overall progress</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {summaries.map((summary) => (
          <button
            key={summary.category}
            type="button"
            className="dashboard-card"
            onClick={() => onNavigate(summary.category)}
          >
            <h3>
              {summary.label}
              {summary.newlyAvailable > 0 && (
                <span className="tab-new-count">+{summary.newlyAvailable}</span>
              )}
            </h3>
            <p className="dashboard-card-progress">
              {summary.completed}/{summary.total} done
            </p>
            {summary.available > 0 && (
              <p className="dashboard-card-available">
                {summary.available} available now
              </p>
            )}
            {summary.open > summary.available && (
              <p className="dashboard-card-open">{summary.open} open total</p>
            )}
          </button>
        ))}
      </div>

      {gameId !== 'xcx' && (
        <section className="dashboard-hints">
          <h3>Quick tips</h3>
          <ul>
            <li>
              Set story flags, affinity charts and party under{' '}
              <strong>Playthrough</strong>. Availability filters then show what
              you can do right now.
            </li>
            <li>
              Use <strong>Browse all</strong> if you want to see every entry
              regardless of your current stand.
            </li>
            <li>
              Newly unlocked entries stay marked until you open them.
            </li>
          </ul>
        </section>
      )}
    </div>
  )
}
