export type StatusFilter = 'all' | 'open' | 'completed'
export type SortMode = 'name' | 'level' | 'region'

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
  showCompleted?: boolean
  onShowCompletedChange?: (value: boolean) => void
  showAll?: boolean
  onShowAllChange?: (value: boolean) => void
  showQuestOptions?: boolean
  showHideCompleted?: boolean
  showPlaythroughOptions?: boolean
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
  showCompleted = true,
  onShowCompletedChange,
  showAll = false,
  onShowAllChange,
  showQuestOptions = false,
  showHideCompleted = false,
  showPlaythroughOptions = false,
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
      {!showHideCompleted && (
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
        >
          <option value="all">All statuses</option>
          <option value="open">Open only</option>
          <option value="completed">Completed only</option>
        </select>
      )}
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
        {showQuestOptions && <option value="region">By region</option>}
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
      {showPlaythroughOptions && (
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => onShowAllChange?.(e.target.checked)}
          />
          Browse all (ignore playthrough)
        </label>
      )}
    </div>
  )
}
