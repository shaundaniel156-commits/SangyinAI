import type { LucideIcon } from 'lucide-react'
import { cn } from '../../../../lib/cn'

export interface SettingsNavItem<T extends string> {
  id: T
  label: string
  icon: LucideIcon
}

interface SettingsNavProps<T extends string> {
  items: SettingsNavItem<T>[]
  value: T
  onChange: (id: T) => void
}

/** Vertical list on large screens; horizontally scrolling pills on small screens. */
export function SettingsNav<T extends string>({ items, value, onChange }: SettingsNavProps<T>) {
  return (
    <nav aria-label="Settings sections" className="-mx-4 lg:mx-0">
      <ul className="flex gap-2 overflow-x-auto px-4 pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
        {items.map((item) => {
          const Icon = item.icon
          const active = item.id === value
          return (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onChange(item.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  'border lg:border-0',
                  active
                    ? 'border-brand-500 bg-brand-soft text-brand-ink'
                    : 'border-line bg-surface text-ink-2 hover:bg-surface-3 hover:text-ink lg:bg-transparent',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
