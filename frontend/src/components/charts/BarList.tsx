import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface BarItem {
  id: string
  label: string
  value: number
  /** Optional secondary text shown after the label. */
  meta?: ReactNode
  tone?: 'brand' | 'good' | 'warn' | 'bad'
}

const FILL = {
  brand: 'bg-linear-to-r from-brand-500 to-sky-400',
  good: 'bg-good',
  warn: 'bg-warn',
  bad: 'bg-bad',
}

interface BarListProps {
  items: BarItem[]
  max?: number
  valueSuffix?: string
  className?: string
}

/** Horizontal bar list — clearer than a chart for ranked categories with long labels. */
export function BarList({ items, max = 100, valueSuffix = '%', className }: BarListProps) {
  return (
    <ul className={cn('space-y-3.5', className)}>
      {items.map((item) => (
        <li key={item.id} title={`${item.label}: ${item.value}${valueSuffix}`}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink">
              {item.label}
              {item.meta && <span className="ml-2 text-ink-3">{item.meta}</span>}
            </span>
            <span className="tabular shrink-0 font-medium text-ink">
              {item.value}
              {valueSuffix}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className={cn('animate-grow h-full rounded-full', FILL[item.tone ?? 'brand'])}
              style={{ width: `${Math.max(2, Math.min(100, (item.value / max) * 100))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
