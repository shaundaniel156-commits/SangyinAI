import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { inputClasses, type SelectOption } from './Field'

export interface FilterDefinition {
  id: string
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}

interface FilterBarProps {
  filters: FilterDefinition[]
  search?: ReactNode
  trailing?: ReactNode
  className?: string
}

/** A single row of search + dropdown filters that wraps on small screens. */
export function FilterBar({ filters, search, trailing, className }: FilterBarProps) {
  return (
    <div className={cn('flex flex-col gap-3 lg:flex-row lg:items-center', className)}>
      {search && <div className="w-full lg:max-w-xs">{search}</div>}
      <div className="grid flex-1 grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
        {filters.map((f) => (
          <label key={f.id} className="block min-w-0 sm:w-auto">
            <span className="sr-only">{f.label}</span>
            <select
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              className={cn(inputClasses, 'h-10 pr-8 sm:min-w-40')}
              aria-label={f.label}
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {trailing && <div className="flex items-center gap-2">{trailing}</div>}
    </div>
  )
}
