import { useEffect, useMemo, useState } from 'react'
import { Checklist } from '../components/Checklist.tsx'
import { CategoryTabs } from '../components/CategoryTabs.tsx'
import { CollectopaediaTable } from '../components/CollectopaediaTable.tsx'
import { Colony6Table } from '../components/Colony6Table.tsx'
import { FilterBar, type SortMode, type StatusFilter } from '../components/FilterBar.tsx'
import { ItemDetail } from '../components/ItemDetail.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { useGameState } from '../hooks/useGameState.ts'
import { useNewlyAvailable } from '../hooks/useNewlyAvailable.ts'
import { useProgress } from '../hooks/useProgress.ts'
import { useTrackableItems } from '../hooks/useTrackableItems.ts'
import { collectAvailableItemIds } from '../lib/available-ids.ts'
import {
  collectopaediaSlotId,
  compareCollectopaediaRegions,
  compareCollectopaediaTypes,
} from '../lib/collectopaedia.ts'
import { isColony6NextLevelMaterial } from '../lib/colony6-availability.ts'
import {
  estimateColony6Percent,
  getAllColony6Levels,
} from '../lib/colony6-levels.ts'
import { buildItemLookup } from '../lib/item-lookup.ts'
import { isH2HAvailable } from '../lib/h2h-availability.ts'
import {
  filterAvailableQuests,
  groupQuestsByRegion,
} from '../lib/quest-ordering.ts'
import { evaluatePrerequisites } from '../lib/prerequisites.ts'
import { getDefaultSortMode } from '../lib/item-filters.ts'
import { filterByDiscoveredRegions, getCanonicalRegion, getRegionSortOrder } from '../lib/region-discovery.ts'
import type { GameState } from '../types/game-state.ts'
import type { Category, GameId, ItemWithStatus, ProgressEntry, TrackableItem } from '../types/tracker.ts'
import { GAME_CATEGORIES } from '../types/tracker.ts'

interface CategoryViewProps {
  gameId: GameId
  initialCategory?: Category
  onCategoryChange?: (category: Category) => void
}

const HIDE_COMPLETED_CATEGORIES: Category[] = [
  'quest',
  'heart_to_heart',
  'unique_monster',
]

const PLAYTHROUGH_FILTER_CATEGORIES: Category[] = [
  'quest',
  'heart_to_heart',
  'colony_reconstruction',
  'unique_monster',
]

function usesTableView(category: Category, gameId: GameId): boolean {
  return (
    category === 'colony_reconstruction' ||
    (category === 'collectopaedia' && gameId === 'xc1')
  )
}

function withDerivedColony6(
  gameState: GameState,
  materials: TrackableItem[],
  progress: Record<string, ProgressEntry>,
): GameState {
  const levels = getAllColony6Levels(materials, progress)
  const estimated = estimateColony6Percent(levels)
  const percent = Math.max(gameState.colony6Reconstruction, estimated)
  if (percent === gameState.colony6Reconstruction) return gameState
  return {
    ...gameState,
    colony6Reconstruction: percent,
    storyFlags: {
      ...gameState.storyFlags,
      colony6_reconstruction_started:
        percent > 0 || gameState.storyFlags.colony6_reconstruction_started === true,
    },
  }
}

function collectCanonicalRegions(
  items: { region?: string }[],
  gameId: GameId,
): string[] {
  const order = getRegionSortOrder(gameId)
  const regions = new Set<string>()
  for (const item of items) {
    const canonical = getCanonicalRegion(item.region)
    if (canonical) regions.add(canonical)
  }
  return [...regions].sort((a, b) => {
    const indexA = order.get(a)
    const indexB = order.get(b)
    if (indexA !== undefined && indexB !== undefined) return indexA - indexB
    if (indexA !== undefined) return -1
    if (indexB !== undefined) return 1
    return a.localeCompare(b)
  })
}

export function CategoryView({
  gameId,
  initialCategory,
  onCategoryChange,
}: CategoryViewProps) {
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
  const [showAll, setShowAll] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { items, allGameItems, loading, error } = useTrackableItems(gameId, category)
  const { progress, toggle, toggleAccepted, toggleCompleted, updateNotes } =
    useProgress()
  const { gameState } = useGameState(gameId)

  const colonyMaterials = useMemo(
    () => allGameItems.filter((i) => i.category === 'colony_reconstruction'),
    [allGameItems],
  )
  const immigrants = useMemo(
    () => allGameItems.filter((i) => i.category === 'colony_immigrant'),
    [allGameItems],
  )
  const effectiveGameState = useMemo(
    () => withDerivedColony6(gameState, colonyMaterials, progress),
    [gameState, colonyMaterials, progress],
  )
  const colonyLevels = useMemo(
    () => getAllColony6Levels(colonyMaterials, progress),
    [colonyMaterials, progress],
  )

  const availableIds = useMemo(
    () => collectAvailableItemIds(allGameItems, progress, effectiveGameState),
    [allGameItems, progress, effectiveGameState],
  )
  const { newIds, markSeen } = useNewlyAvailable(availableIds)

  useEffect(() => {
    if (!initialCategory) return
    setCategory(initialCategory)
    setSelectedId(null)
    setSortMode(getDefaultSortMode(initialCategory))
    setShowAll(false)
  }, [initialCategory])

  const filterRegions = useMemo(
    () => collectCanonicalRegions(items, gameId),
    [items, gameId],
  )

  const itemsWithStatus = useMemo((): ItemWithStatus[] => {
    return items.map((item) => {
      const { status, unmet } = evaluatePrerequisites(
        item,
        progress,
        allGameItems,
        effectiveGameState,
      )

      let prerequisiteStatus = status
      let unmetPrerequisites = unmet

      if (item.category === 'colony_reconstruction') {
        const available = isColony6NextLevelMaterial(
          item,
          colonyLevels,
          effectiveGameState,
        )
        prerequisiteStatus = available ? 'fulfilled' : 'blocked'
        unmetPrerequisites = available
          ? []
          : [{ type: 'area', label: 'Not the next level yet, or source locked' }]
      }

      return {
        ...item,
        completed: progress[item.id]?.completed ?? false,
        prerequisiteStatus,
        unmetPrerequisites,
      }
    })
  }, [items, progress, allGameItems, effectiveGameState, colonyLevels])

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
      result = result.filter(
        (item) => getCanonicalRegion(item.region) === region,
      )
    }

    const playthroughMode = !showAll

    if (
      playthroughMode &&
      (gameId === 'xc1' ||
        gameId === 'xc2' ||
        gameId === 'xc2-torna' ||
        gameId === 'xc3' ||
        gameId === 'xc3-fr' ||
        gameId === 'xc1-fc') &&
      category !== 'collectopaedia' &&
      category !== 'colony_reconstruction' &&
      category !== 'blade' &&
      category !== 'hero'
    ) {
      result = filterByDiscoveredRegions(result, effectiveGameState)
    }

    if (category === 'quest' && playthroughMode) {
      result = filterAvailableQuests(
        result,
        allGameItems,
        progress,
        effectiveGameState,
      ) as ItemWithStatus[]
      // Keep accepted-but-incomplete quests visible in playthrough mode
      const acceptedOpen = itemsWithStatus.filter((item) => {
        if (item.completed) return false
        if (!(progress[item.id]?.accepted === true)) return false
        if (search) {
          const q = search.toLowerCase()
          if (
            !item.name.toLowerCase().includes(q) &&
            !item.region?.toLowerCase().includes(q)
          ) {
            return false
          }
        }
        if (region && getCanonicalRegion(item.region) !== region) return false
        return !result.some((r) => r.id === item.id)
      })
      if (acceptedOpen.length > 0) {
        result = [...result, ...acceptedOpen]
      }
    }

    if (category === 'heart_to_heart' && playthroughMode) {
      result = result.filter((item) =>
        isH2HAvailable(item, progress, effectiveGameState),
      )
    }

    if (category === 'colony_reconstruction' && playthroughMode) {
      result = result.filter(
        (item) =>
          item.completed ||
          isColony6NextLevelMaterial(item, colonyLevels, effectiveGameState),
      )
    }

    let groups = undefined
    if (category === 'quest' && (sortMode === 'region' || sortMode === 'name')) {
      groups = groupQuestsByRegion(result)
      if (sortMode === 'name') {
        groups = groups.map((group) => ({
          ...group,
          items: [...group.items].sort((a, b) => a.name.localeCompare(b.name)),
        }))
      }
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
    showAll,
    showCompleted,
    allGameItems,
    progress,
    effectiveGameState,
    colonyLevels,
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
    if (category === 'colony_reconstruction') {
      const materialDone = itemsWithStatus.filter((i) => i.completed).length
      const immigrantDone = immigrants.filter(
        (i) =>
          progress[i.id]?.completed === true || progress[i.id]?.accepted === true,
      ).length
      return {
        completed: materialDone + immigrantDone,
        total: itemsWithStatus.length + immigrants.length,
      }
    }
    return {
      completed: itemsWithStatus.filter((i) => i.completed).length,
      total: itemsWithStatus.length,
    }
  }, [category, gameId, itemsWithStatus, progress, immigrants])

  const itemLookup = useMemo(
    () => buildItemLookup(allGameItems),
    [allGameItems],
  )

  const newCounts = useMemo(() => {
    const counts: Partial<Record<Category, number>> = {}
    for (const cat of availableCategories) {
      if (cat === 'colony_reconstruction') {
        counts[cat] = allGameItems.filter(
          (i) =>
            (i.category === 'colony_reconstruction' ||
              i.category === 'colony_immigrant') &&
            newIds.has(i.id),
        ).length
      } else {
        counts[cat] = allGameItems.filter(
          (i) => i.category === cat && newIds.has(i.id),
        ).length
      }
    }
    return counts
  }, [allGameItems, availableCategories, newIds])

  const notesById = useMemo(() => {
    const map: Record<string, string | undefined> = {}
    for (const [id, entry] of Object.entries(progress)) {
      if (entry.notes) map[id] = entry.notes
    }
    return map
  }, [progress])

  const acceptedById = useMemo(() => {
    const map: Record<string, boolean> = {}
    for (const [id, entry] of Object.entries(progress)) {
      if (entry.accepted || entry.completed) map[id] = true
    }
    return map
  }, [progress])

  const selectedItem =
    itemsWithStatus.find((i) => i.id === selectedId) ?? null
  const tableView = usesTableView(category, gameId)

  const handleSelect = (id: string) => {
    setSelectedId(id)
    markSeen(id)
  }

  const handleCategoryChange = (next: Category) => {
    setCategory(next)
    setSelectedId(null)
    setRegion('')
    setSortMode(getDefaultSortMode(next))
    setShowAll(false)
    onCategoryChange?.(next)
  }

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
        onChange={handleCategoryChange}
        availableCategories={availableCategories}
        newCounts={newCounts}
      />

      {(gameId === 'xc1' ||
        gameId === 'xc2' ||
        gameId === 'xc2-torna' ||
        gameId === 'xc3' ||
        gameId === 'xc3-fr') &&
        PLAYTHROUGH_FILTER_CATEGORIES.includes(category) && (
        <p className="category-playthrough-hint">
          Playthrough mode is on by default — only currently available entries are
          shown. Use <strong>Browse all</strong> to see everything. Update your
          stand under <strong>Playthrough</strong>. Newly unlocked entries stay
          marked until you open them.
        </p>
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
        regions={filterRegions}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        showCompleted={showCompleted}
        onShowCompletedChange={setShowCompleted}
        showAll={showAll}
        onShowAllChange={setShowAll}
        showQuestOptions={category === 'quest'}
        showHideCompleted={HIDE_COMPLETED_CATEGORIES.includes(category)}
        showPlaythroughOptions={PLAYTHROUGH_FILTER_CATEGORIES.includes(category)}
      />

      <div className={`content-split ${tableView ? 'content-split-table' : ''}`}>
        {category === 'collectopaedia' && gameId === 'xc1' ? (
          <CollectopaediaTable
            items={filteredItems}
            progress={progress}
            onToggleSlot={toggle}
            gameState={effectiveGameState}
            itemLookup={itemLookup}
          />
        ) : category === 'colony_reconstruction' ? (
          <Colony6Table
            items={filteredItems}
            immigrants={immigrants}
            progress={progress}
            gameState={effectiveGameState}
            onToggle={toggle}
            onInvite={toggle}
            onSelect={handleSelect}
            newIds={newIds}
            playthroughMode={!showAll}
          />
        ) : (
          <Checklist
            items={filteredItems}
            groups={questGroups}
            selectedId={selectedId}
            onSelect={handleSelect}
            onToggle={toggle}
            onToggleAccepted={category === 'quest' ? toggleAccepted : undefined}
            onToggleCompleted={category === 'quest' ? toggleCompleted : undefined}
            newIds={newIds}
            notesById={notesById}
            acceptedById={acceptedById}
          />
        )}
        {!tableView && (
          <ItemDetail
            item={selectedItem}
            onClose={() => setSelectedId(null)}
            notes={selectedId ? progress[selectedId]?.notes ?? '' : ''}
            onNotesChange={updateNotes}
          />
        )}
      </div>
    </div>
  )
}
