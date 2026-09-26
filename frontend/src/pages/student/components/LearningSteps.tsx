import { CheckCircle2, Circle, CircleDot } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { cn } from '../../../lib/cn'
import type { PracticeActivity } from '../../../types'
import type { LearningStep } from './studentData'

const STATE = {
  completed: { icon: CheckCircle2, label: 'Done', className: 'text-good' },
  current: { icon: CircleDot, label: 'Now', className: 'text-brand-600' },
  upcoming: { icon: Circle, label: 'Coming up', className: 'text-ink-3' },
} as const

interface LearningStepsProps {
  steps: LearningStep[]
  onOpen?: (activity: PracticeActivity) => void
}

/** Vertical list of guided steps with completed / current / upcoming states. */
export function LearningSteps({ steps, onOpen }: LearningStepsProps) {
  return (
    <ol className="relative">
      {steps.map((step, i) => {
        const s = STATE[step.state]
        const Icon = s.icon
        const last = i === steps.length - 1
        return (
          <li key={step.title} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && <span className="absolute left-[11px] top-7 bottom-1 w-px bg-line" aria-hidden />}
            <Icon className={cn('mt-0.5 size-6 shrink-0', s.className)} aria-hidden />
            <div
              className={cn(
                'min-w-0 flex-1 rounded-lg p-3',
                step.state === 'current' ? 'border border-brand-200 bg-brand-soft dark:border-brand-800' : 'bg-surface-2',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-ink-3">Step {i + 1}</p>
                  <p className={cn('text-sm font-semibold', step.state === 'upcoming' ? 'text-ink-2' : 'text-ink')}>{step.title}</p>
                </div>
                <StatusBadge tone={step.state === 'completed' ? 'good' : step.state === 'current' ? 'info' : 'neutral'}>
                  <span className="sr-only">Status: </span>
                  {s.label}
                </StatusBadge>
              </div>
              {step.activity && step.state !== 'completed' && (
                <p className="mt-1 text-xs text-ink-3">
                  {step.activity.questions} questions · about {step.activity.estimatedMinutes} min
                </p>
              )}
              {step.state === 'current' && step.activity && onOpen && (
                <Button size="sm" className="mt-3" onClick={() => onOpen(step.activity!)}>
                  {step.activity.status === 'in_progress' ? 'Continue' : 'Start'}
                </Button>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
