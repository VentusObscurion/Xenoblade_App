import type { Category } from '../types/tracker.ts'
import { CATEGORY_LABELS } from '../types/tracker.ts'

interface CategoryTabsProps {
  active: Category
  onChange: (category: Category) => void
  availableCategories: Category[]
}

export function CategoryTabs({
  active,
  onChange,
  availableCategories,
}: CategoryTabsProps) {
  return (
    <nav className="category-tabs" role="tablist">
      {availableCategories.map((category) => (
        <button
          key={category}
          role="tab"
          aria-selected={active === category}
          className={`category-tab ${active === category ? 'active' : ''}`}
          onClick={() => onChange(category)}
        >
          {CATEGORY_LABELS[category]}
        </button>
      ))}
    </nav>
  )
}
