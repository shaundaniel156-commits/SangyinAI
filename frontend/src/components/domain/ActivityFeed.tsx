import { ClipboardList, PencilRuler, RefreshCw, Sparkles, Stethoscope } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { ActivityItem } from '../../types'

/** One accent per activity kind so the timeline scans at a glance. */
const TONE: Record<ActivityItem['kind'], string> = {
  assessment: 'bg-brand-soft text-brand-ink ring-brand-400/25',
  guidance: 'bg-violet-400/12 text-violet-300 ring-violet-400/25',
  diagnostic: 'bg-cyan-400/12 text-cyan-300 ring-cyan-400/25',
  sync: 'bg-surface-3 text-ink-3 ring-line',
  practice: 'bg-good-soft text-good-ink ring-good/25',
}

const ICONS = {
  assessment: ClipboardList,
  guidance: Sparkles,
  diagnostic: Stethoscope,
  sync: RefreshCw,
  practice: PencilRuler,
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <ol className="px-5 py-5 sm:px-6">
      {items.map((item, i) => {
        const Icon = ICONS[item.kind]
        return (
          <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < items.length - 1 && (
              <span className="absolute left-[15px] top-9 h-[calc(100%-2.25rem)] w-px bg-linear-to-b from-brand-400/40 to-line" aria-hidden />
            )}
            <span className={cn('grid size-8 shrink-0 place-items-center rounded-full ring-1', TONE[item.kind])}>
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 pt-1">
              <p className="text-sm text-ink">{item.text}</p>
              <p className="mt-0.5 text-xs text-ink-3">{item.time}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
