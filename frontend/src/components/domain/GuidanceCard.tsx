import { ChevronRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getStudent } from '../../data/students'
import { formatShortDate } from '../../lib/format'
import type { GuidancePlan } from '../../types'
import { GuidanceStatusBadge } from './GuidanceStatusBadge'

/** Compact row summarising a guidance plan; links to the review screen. */
export function GuidanceCard({ plan, showMethod = true }: { plan: GuidancePlan; showMethod?: boolean }) {
  const student = getStudent(plan.studentId)
  return (
    <Link to={`/guidance/${plan.id}`} className="group flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-surface-2">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-50 text-accent-700 dark:bg-[#10302a] dark:text-[#7fd9c4]">
        <Sparkles className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-ink">{student?.name}</p>
          <span className="shrink-0 text-xs text-ink-3">{formatShortDate(plan.createdOn)}</span>
        </div>
        <p className="truncate text-sm text-ink-2">{plan.competencyGap}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <GuidanceStatusBadge status={plan.status} />
          {showMethod && <span className="truncate text-xs text-ink-3">{plan.teachingApproach.method}</span>}
        </div>
      </div>
      <ChevronRight className="mt-2 size-4 shrink-0 text-ink-3 group-hover:text-ink" aria-hidden />
    </Link>
  )
}
