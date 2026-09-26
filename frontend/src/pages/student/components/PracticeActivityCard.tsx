import { CheckCircle2, CircleDot, Clock, ListOrdered, Play } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { DEMO_IN_PROGRESS_ANSWERED } from '../../../data/practice'
import { formatShortDate } from '../../../lib/format'
import type { PracticeActivity } from '../../../types'
import { PRACTICE_STATUS_LABEL } from './studentData'

interface PracticeActivityCardProps {
  activity: PracticeActivity
  onOpen?: (activity: PracticeActivity) => void
}

export function PracticeActivityCard({ activity, onOpen }: PracticeActivityCardProps) {
  const { status } = activity
  return (
    <article className="card-glow animate-rise rounded-2xl border border-line bg-surface-2/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">{activity.title}</h3>
          <p className="text-xs text-ink-3">
            {activity.subject} · {activity.focus}
          </p>
        </div>
        {status === 'completed' ? (
          <StatusBadge tone="good" icon={CheckCircle2}>
            {PRACTICE_STATUS_LABEL.completed}
          </StatusBadge>
        ) : status === 'in_progress' ? (
          <StatusBadge tone="info" icon={CircleDot}>
            {PRACTICE_STATUS_LABEL.in_progress}
          </StatusBadge>
        ) : (
          activity.dueLabel && <StatusBadge>{activity.dueLabel}</StatusBadge>
        )}
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
        <span className="inline-flex items-center gap-1">
          <ListOrdered className="size-3.5" aria-hidden />
          {activity.questions} questions
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden />
          About {activity.estimatedMinutes} min
        </span>
        {activity.completedOn && <span>Finished {formatShortDate(activity.completedOn)}</span>}
      </p>

      {status === 'in_progress' && (
        <ProgressBar
          className="mt-3"
          size="sm"
          value={DEMO_IN_PROGRESS_ANSWERED}
          max={activity.questions}
          srLabel={`${activity.title}: ${DEMO_IN_PROGRESS_ANSWERED} of ${activity.questions} questions done`}
        />
      )}
      {status === 'in_progress' && (
        <p className="mt-1.5 text-xs text-ink-3">
          {DEMO_IN_PROGRESS_ANSWERED} of {activity.questions} questions done
        </p>
      )}

      {status !== 'completed' && onOpen && (
        <Button
          className="mt-4 w-full sm:w-auto"
          size="sm"
          variant={status === 'in_progress' ? 'primary' : 'secondary'}
          icon={<Play className="size-4" aria-hidden />}
          onClick={() => onOpen(activity)}
          aria-label={`${status === 'in_progress' ? 'Continue' : 'Start'} ${activity.title}`}
        >
          {status === 'in_progress' ? 'Continue' : 'Start'}
        </Button>
      )}
    </article>
  )
}
