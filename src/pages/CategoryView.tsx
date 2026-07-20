import { useEffect, useMemo, useState } from 'react'
import { Checklist } from '../components/Checklist.tsx'
import { CategoryTabs } from '../components/CategoryTabs.tsx'
import { CollectopaediaTable } from '../components/CollectopaediaTable.tsx'
import { Colony6Table } from '../components/Colony6Table.tsx'
import { FilterBar, type SortMode, type StatusFilter } from '../components/FilterBar.tsx'
import { GameStatePanel } from '../components/GameStatePanel.tsx'
import { ItemDetail } from '../components/ItemDetail.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { useGameState } from '../hooks/useGameState.ts'
import { useProgress } from '../hooks/useProgress.ts'
import { useTrackableItems } from '../hooks/useTrackableItems.ts'
import { collectopaediaSlotId, compareCollectopaediaRegions, compareCollectopaediaTypes } from '../lib/collectopaedia.ts'
import { buildItemLookup } from '../lib/item-lookup.ts'
import { isH2HAvailable } from '../lib/h2h-availability.ts'
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
  initialCategory?: Category
}

const HIDE_COMPLETED_CATEGORIES: Category[] = [
  'quest',
  'heart_to_heart',
  'unique_monster',
]

function usesTableView(category: Category, gameId: GameId): boolean {
  return (
    category === 'colony_reconstruction' ||
    (category === 'collectopaedia' && gameId === 'xc1')
  )
}

export function CategoryView({ gameId, initialCategory }: CategoryViewProps) {
  const availableCategories = GAME_CATEGORIES[gameId]
  const [category, setCategory] = useState<Category>(
    initialCategory ?? availableCategories[0],
  )
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [region, setRegion] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>(() =>
    getDefaultSortMode(initialCategory ?? availableCategories[0]),
  )
  const [hideUntilPrereqDone, setHideUntilPrereqDone] = useState(true)
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(
    (initialCategory ?? availableCategories[0]) === 'heart_to_heart',
  )
  const [showCompleted, setShowCompleted] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { items, allGameItems, loading, error } = useTrackableItems(gameId, category)
  const { progress, toggle } = useProgress()
  const {
    gameState,
    setPlayerLevel,
    setAreaAffinity,
    setAreaDiscovered,
    setPartyMember,
    setCharacterAffinity,
  } = useGameState(gameId)

  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory)
      setSelectedId(null)
      setSortMode(getDefaultSortMode(initialCategory))
      setShowOnlyAvailable(initialCategory === 'heart_to_heart')
    }
  }, [initialCategory])

  useEffect(() => {
    if (category === 'heart_to_heart') {
      setShowOnlyAvailable(true)
    }
  }, [category])

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
      result = result.filter((item) => {
        const slotText = item.collectopaediaSlots?.join(' ').toLowerCase() ?? ''
        const charText = item.characters?.join(' ').toLowerCase() ?? ''
        return (
          item.name.toLowerCase().includes(q) ||
          item.region?.toLowerCase().includes(q) ||
          item.subLocation?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.collectType?.toLowerCase().includes(q) ||
          item.obtainedFrom?.toLowerCase().includes(q) ||
          charText.includes(q) ||
          slotText.includes(q)
        )
      })
    }

    if (statusFilter === 'open') {
      result = result.filter((item) => !item.completed)
    } else if (statusFilter === 'completed') {
      result = result.filter((item) => item.completed)
    }

    if (HIDE_COMPLETED_CATEGORIES.includes(category) && !showCompleted) {
      result = result.filter((item) => !item.completed)
    }

    if (region) {
      result = result.filter((item) => item.region === region)
    }

    if (
      gameId === 'xc1' &&
      category !== 'collectopaedia' &&
      category !== 'colony_reconstruction'
    ) {
      result = filterByDiscoveredRegions(result, gameState)
    }

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

    if (category === 'heart_to_heart' && showOnlyAvailable) {
      result = result.filter((item) => isH2HAvailable(item, progress, gameState))
    }

    let groups = undefined
    if (category === 'quest' && sortMode === 'prerequisites') {
      groups = groupQuestsByDepth(result, allQuests)
    } else if (sortMode === 'level') {
      result = [...result].sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
    } else if (!usesTableView(category, gameId)) {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name))
    } else if (category === 'colony_reconstruction') {
      result = [...result].sort((a, b) => {
        const levelA = a.colonyLevel ?? 0
        const levelB = b.colonyLevel ?? 0
        if (levelA !== levelB) return levelA - levelB
        return a.name.localeCompare(b.name)
      })
    } else if (category === 'collectopaedia') {
      result = [...result].sort((a, b) => {
        const regionCmp = compareCollectopaediaRegions(a.region ?? '', b.region ?? '')
        if (regionCmp !== 0) return regionCmp
        return compareCollectopaediaTypes(a.collectType ?? '', b.collectType ?? '')
      })
    }

    return { filteredItems: result, questGroups: groups }
  }, [
    itemsWithStatus,
    search,
    statusFilter,
    region,
    sortMode,
    category,
    gameId,
    hideUntilPrereqDone,
    showOnlyAvailable,
    showCompleted,
    allQuests,
    progress,
    gameState,
  ])

  const progressStats = useMemo(() => {
    if (category === 'collectopaedia' && gameId === 'xc1') {
      let total = 0
      let completed = 0
      for (const item of itemsWithStatus) {
        item.collectopaediaSlots?.forEach((slot, index) => {
          if (!slot) return
          total++
          if (progress[collectopaediaSlotId(item.id, index)]?.completed) completed++
        })
      }
      return { completed, total }
    }
    return {
      completed: itemsWithStatus.filter((i) => i.completed).length,
      total: itemsWithStatus.length,
    }
  }, [category, gameId, itemsWithStatus, progress])

  const itemLookup = useMemo(
    () => buildItemLookup(allGameItems),
    [allGameItems],
  )

  const selectedItem =
    itemsWithStatus.find((i) => i.id === selectedId) ?? null
  const tableView = usesTableView(category, gameId)
  const showGameStatePanel =
    gameId === 'xc1' &&
    (category === 'heart_to_heart' || category === 'quest' || category === 'unique_monster')

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
          if (c === 'heart_to_heart') setShowOnlyAvailable(true)
        }}
        availableCategories={availableCategories}
      />

      {showGameStatePanel && (
        <GameStatePanel
          gameState={gameState}
          onLevelChange={setPlayerLevel}
          onAffinityChange={setAreaAffinity}
          onDiscoveredChange={setAreaDiscovered}
          onPartyMemberChange={setPartyMember}
          onCharacterAffinityChange={setCharacterAffinity}
        />
      )}

      <ProgressBar
        completed={progressStats.completed}
        total={progressStats.total}
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
        showCompleted={showCompleted}
        onShowCompletedChange={setShowCompleted}
        showQuestOptions={category === 'quest'}
        showHideCompleted={HIDE_COMPLETED_CATEGORIES.includes(category)}
        showAvailabilityOptions={
          category === 'quest' || category === 'heart_to_heart'
        }
      />

      <div className={`content-split ${tableView ? 'content-split-table' : ''}`}>
        {category === 'collectopaedia' && gameId === 'xc1' ? (
          <CollectopaediaTable
            items={filteredItems}
            progress={progress}
            onToggleSlot={toggle}
            gameState={gameState}
            itemLookup={itemLookup}
          />
        ) : category === 'colony_reconstruction' ? (
          <Colony6Table items={filteredItems} onToggle={toggle} />
        ) : (
          <Checklist
            items={filteredItems}
            groups={questGroups}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onToggle={toggle}
          />
        )}
        {!tableView && (
          <ItemDetail item={selectedItem} onClose={() => setSelectedId(null)} />
        )}
      </div>
    </div>
  )
}
