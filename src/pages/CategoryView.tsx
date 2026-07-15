import { useMemo, useState } from 'react'
import { Checklist } from '../components/Checklist.tsx'
import { CategoryTabs } from '../components/CategoryTabs.tsx'
import { FilterBar, type SortMode, type StatusFilter } from '../components/FilterBar.tsx'
import { GameStatePanel } from '../components/GameStatePanel.tsx'
import { ItemDetail } from '../components/ItemDetail.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { useGameState } from '../hooks/useGameState.ts'
import { useProgress } from '../hooks/useProgress.ts'
import { useTrackableItems } from '../hooks/useTrackableItems.ts'
import {
  filterAvailableQuests,
  filterVisibleQuests,
  groupQuestsByDepth,
} from '../lib/quest-ordering.ts'
import { evaluatePrerequisites } from '../lib/prerequisites.ts'
import { getDefaultSortMode } from '../lib/item-filters.ts'
import { filterByDiscoveredRegions } from '../lib/region-discovery.ts'
import type { Category, GameId, ItemWithStatus } from '../types/tracker.ts'
import { GAME_CATEGORIES } from '../types/tracker.ts'

interface CategoryViewProps {
  gameId: GameId
}

export function CategoryView({ gameId }: CategoryViewProps) {
  const availableCategories = GAME_CATEGORIES[gameId]
  const [category, setCategory] = useState<Category>(availableCategories[0])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [region, setRegion] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>(() =>
    getDefaultSortMode(availableCategories[0]),
  )
  const [hideUntilPrereqDone, setHideUntilPrereqDone] = useState(true)
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { items, allGameItems, loading, error } = useTrackableItems(gameId, category)
  const { progress, toggle } = useProgress()
  const { gameState, setPlayerLevel, setAreaAffinity, setAreaDiscovered } =
    useGameState(gameId)

  const allQuests = useMemo(
    () => allGameItems.filter((i) => i.category === 'quest'),
    [allGameItems],
  )

  const itemsWithStatus = useMemo((): ItemWithStatus[] => {
    return items.map((item) => {
      const { status, unmet } = evaluatePrerequisites(
        item,
        progress,
        allGameItems,
        gameState,
      )
      return {
        ...item,
        completed: progress[item.id]?.completed ?? false,
        prerequisiteStatus: status,
        unmetPrerequisites: unmet,
      }
    })
  }, [items, progress, allGameItems, gameState])

  const { filteredItems, questGroups } = useMemo(() => {
    let result = itemsWithStatus

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.region?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q),
      )
    }

    if (statusFilter === 'open') {
      result = result.filter((item) => !item.completed)
    } else if (statusFilter === 'completed') {
      result = result.filter((item) => item.completed)
    }

    if (region) {
      result = result.filter((item) => item.region === region)
    }

    result = filterByDiscoveredRegions(result, gameState)

    if (category === 'quest') {
      result = filterVisibleQuests(
        result,
        allQuests,
        progress,
        hideUntilPrereqDone,
      ) as ItemWithStatus[]

      if (showOnlyAvailable) {
        result = filterAvailableQuests(
          result,
          allQuests,
          progress,
          gameState,
        ) as ItemWithStatus[]
      }
    }

    let groups = undefined
    if (category === 'quest' && sortMode === 'prerequisites') {
      groups = groupQuestsByDepth(result, allQuests)
    } else if (sortMode === 'level') {
      result = [...result].sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
    } else {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name))
    }

    return { filteredItems: result, questGroups: groups }
  }, [
    itemsWithStatus,
    search,
    statusFilter,
    region,
    sortMode,
    category,
    hideUntilPrereqDone,
    showOnlyAvailable,
    allQuests,
    progress,
    gameState,
  ])

  const completedCount = itemsWithStatus.filter((i) => i.completed).length
  const selectedItem =
    itemsWithStatus.find((i) => i.id === selectedId) ?? null

  if (loading) {
    return <p className="loading">Loading data...</p>
  }

  if (error) {
    return <p className="error">Error: {error}</p>
  }

  return (
    <div className="category-view">
      <CategoryTabs
        active={category}
        onChange={(c) => {
          setCategory(c)
          setSelectedId(null)
          setSortMode(getDefaultSortMode(c))
        }}
        availableCategories={availableCategories}
      />

      {gameId === 'xc1' && (
        <GameStatePanel
          gameState={gameState}
          onLevelChange={setPlayerLevel}
          onAffinityChange={setAreaAffinity}
          onDiscoveredChange={setAreaDiscovered}
        />
      )}

      <ProgressBar
        completed={completedCount}
        total={itemsWithStatus.length}
        label="Progress"
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        region={region}
        onRegionChange={setRegion}
        regions={[...new Set(items.map((i) => i.region).filter(Boolean) as string[])].sort()}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        hideUntilPrereqDone={hideUntilPrereqDone}
        onHideUntilPrereqDoneChange={setHideUntilPrereqDone}
        showOnlyAvailable={showOnlyAvailable}
        onShowOnlyAvailableChange={setShowOnlyAvailable}
        showQuestOptions={category === 'quest'}
      />

      <div className="content-split">
        <Checklist
          items={filteredItems}
          groups={questGroups}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onToggle={toggle}
        />
        <ItemDetail item={selectedItem} onClose={() => setSelectedId(null)} />
      </div>
    </div>
  )
}
