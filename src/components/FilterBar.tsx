export type StatusFilter = 'all' | 'open' | 'completed'
export type SortMode = 'name' | 'level' | 'prerequisites'

interface FilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: StatusFilter
  onStatusFilterChange: (value: StatusFilter) => void
  region: string
  onRegionChange: (value: string) => void
  regions: string[]
  sortMode: SortMode
  onSortModeChange: (value: SortMode) => void
  hideUntilPrereqDone: boolean
  onHideUntilPrereqDoneChange: (value: boolean) => void
  showOnlyAvailable: boolean
  onShowOnlyAvailableChange: (value: boolean) => void
  showCompleted?: boolean
  onShowCompletedChange?: (value: boolean) => void
  showQuestOptions?: boolean
  showHideCompleted?: boolean
  showAvailabilityOptions?: boolean
}

export function FilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  region,
  onRegionChange,
  regions,
  sortMode,
  onSortModeChange,
  hideUntilPrereqDone,
  onHideUntilPrereqDoneChange,
  showOnlyAvailable,
  onShowOnlyAvailableChange,
  showCompleted = true,
  onShowCompletedChange,
  showQuestOptions = false,
  showHideCompleted = false,
  showAvailabilityOptions = false,
}: FilterBarProps) {
  return (
    <div className="filter-bar">
      <input
        type="search"
        className="filter-search"
        placeholder="Search..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <select
        className="filter-select"
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
      >
        <option value="all">All</option>
        <option value="open">Open only</option>
        <option value="completed">Completed only</option>
      </select>
      {regions.length > 0 && (
        <select
          className="filter-select"
          value={region}
          onChange={(e) => onRegionChange(e.target.value)}
        >
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      )}
      <select
        className="filter-select"
        value={sortMode}
        onChange={(e) => onSortModeChange(e.target.value as SortMode)}
      >
        <option value="name">By name</option>
        <option value="level">By level</option>
        {showQuestOptions && (
          <option value="prerequisites">By prerequisites</option>
        )}
      </select>
      {showHideCompleted && (
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => onShowCompletedChange?.(e.target.checked)}
          />
          Show completed
        </label>
      )}
      {showQuestOptions && (
        <>
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={hideUntilPrereqDone}
              onChange={(e) => onHideUntilPrereqDoneChange(e.target.checked)}
            />
            Unlock via prior quests
          </label>
        </>
      )}
      {showAvailabilityOptions && (
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={showOnlyAvailable}
            onChange={(e) => onShowOnlyAvailableChange(e.target.checked)}
          />
          Available only
        </label>
      )}
    </div>
  )
}
