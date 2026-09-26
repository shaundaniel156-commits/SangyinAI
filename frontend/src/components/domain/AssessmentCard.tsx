import { ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ASSESSMENT_STATUS_LABEL } from '../../data/assessments'
import { getClass } from '../../data/classes'
import { formatShortDate } from '../../lib/format'
import type { Assessment } from '../../types'
import { StatusBadge, type Tone } from '../ui/StatusBadge'

export const ASSESSMENT_STATUS_TONE: Record<Assessment['status'], Tone> = {
  draft: 'neutral',
  scheduled: 'info',
  awaiting_scores: 'warn',
  completed: 'good',
}

export function AssessmentStatusBadge({ status }: { status: Assessment['status'] }) {
  return <StatusBadge tone={ASSESSMENT_STATUS_TONE[status]}>{ASSESSMENT_STATUS_LABEL[status]}</StatusBadge>
}

/** Compact assessment row used in dashboards and class views. */
export function AssessmentCard({ assessment }: { assessment: Assessment }) {
  const cls = getClass(assessment.classId)
  return (
    <Link to={`/assessments/${assessment.id}`} className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-surface-2">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
        <ClipboardList className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{assessment.title}</p>
        <p className="truncate text-sm text-ink-3">
          {assessment.type} · {cls?.name} · {formatShortDate(assessment.date)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {assessment.average !== undefined ? (
          <span className="tabular text-sm font-semibold text-ink">{assessment.average}%</span>
        ) : (
          <span className="text-sm text-ink-3">—</span>
        )}
        <AssessmentStatusBadge status={assessment.status} />
      </div>
    </Link>
  )
}
