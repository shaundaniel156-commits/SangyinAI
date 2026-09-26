import type { LucideIcon } from 'lucide-react'
import { LevelBadge } from '../../../components/ui/StatusBadge'
import type { CompetencyScore } from '../../../types'

interface TopicListProps {
  topics: CompetencyScore[]
  empty: string
  icon?: LucideIcon
}

/** Short list of topics with plain-language level labels (no scores). */
export function TopicList({ topics, empty, icon: Icon }: TopicListProps) {
  if (topics.length === 0) return <p className="text-sm text-ink-3">{empty}</p>
  return (
    <ul className="divide-y divide-line">
      {topics.map((t) => (
        <li key={t.competencyId} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
          <span className="flex min-w-0 items-center gap-2.5">
            {Icon && <Icon className="size-4 shrink-0 text-ink-3" aria-hidden />}
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink">{t.name}</span>
              <span className="block text-xs text-ink-3">{t.subject}</span>
            </span>
          </span>
          <LevelBadge level={t.level} friendly />
        </li>
      ))}
    </ul>
  )
}
