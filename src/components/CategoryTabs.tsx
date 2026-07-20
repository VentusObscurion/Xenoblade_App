import type { Category } from '../types/tracker.ts'
import { CATEGORY_LABELS } from '../types/tracker.ts'

interface CategoryTabsProps {
  active: Category
  onChange: (category: Category) => void
  availableCategories: Category[]
  newCounts?: Partial<Record<Category, number>>
}

export function CategoryTabs({
  active,
  onChange,
  availableCategories,
  newCounts,
}: CategoryTabsProps) {
  return (
    <nav className="category-tabs" role="tablist">
      {availableCategories.map((category) => {
        const newCount = newCounts?.[category] ?? 0
        return (
          <button
            key={category}
            role="tab"
            aria-selected={active === category}
            className={`category-tab ${active === category ? 'active' : ''}`}
            onClick={() => onChange(category)}
          >
            {CATEGORY_LABELS[category]}
            {newCount > 0 && <span className="tab-new-count">+{newCount}</span>}
          </button>
        )
      })}
    </nav>
  )
}
