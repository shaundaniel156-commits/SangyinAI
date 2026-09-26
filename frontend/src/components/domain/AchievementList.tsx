import { Flame, TrendingUp, Trophy } from 'lucide-react'
import { cn } from '../../lib/cn'

interface Achievement {
  id: string
  title: string
  date: string
}

/** Badge style per kind of achievement, picked from its wording. */
function badgeFor(title: string) {
  if (/days? in a row|streak/i.test(title)) return { icon: Flame, cls: 'bg-warn-soft text-warn-ink ring-warn/30' }
  if (/strong|improv/i.test(title)) return { icon: TrendingUp, cls: 'bg-cyan-400/12 text-cyan-300 ring-cyan-400/30' }
  return { icon: Trophy, cls: 'bg-good-soft text-good-ink ring-good/30' }
}

/** Rewarding list of recent achievements with a small badge for each. */
export function AchievementList({ items, formatDate }: { items: Achievement[]; formatDate: (iso: string) => string }) {
  return (
    <ul className="space-y-2.5 p-5 sm:p-6">
      {items.map((a) => {
        const b = badgeFor(a.title)
        return (
          <li key={a.id} className="flex items-center gap-3 rounded-xl bg-surface-2/60 px-3 py-2.5">
            <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl ring-1', b.cls)}>
              <b.icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-sm font-medium text-ink">{a.title}</span>
            <span className="shrink-0 text-xs text-ink-3">{formatDate(a.date)}</span>
          </li>
        )
      })}
    </ul>
  )
}
