import { Check, ClipboardList, SendHorizontal, Sparkles, UserCheck } from 'lucide-react'
import { cn } from '../../../lib/cn'

const STEPS = [
  { label: 'Report data', hint: 'You submit results & notes', icon: ClipboardList },
  { label: 'AI draft', hint: 'Questions for each gap', icon: Sparkles },
  { label: 'Your review', hint: 'Edit, then approve', icon: UserCheck },
  { label: 'Sent to students', hint: 'Practice + a note for parents', icon: SendHorizontal },
]

/** The teacher-in-the-loop flow; `current` is the 0-based active step (steps before it show as done). */
export function WorkflowSteps({ current, className }: { current: number; className?: string }) {
  return (
    <ol className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)} aria-label="Assessment workflow">
      {STEPS.map((s, i) => {
        const done = i < current
        const active = i === current
        const Icon = done ? Check : s.icon
        return (
          <li
            key={s.label}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
              active ? 'border-brand-500 bg-brand-soft' : 'border-line bg-surface',
            )}
          >
            <span
              className={cn(
                'grid size-9 shrink-0 place-items-center rounded-full',
                done ? 'bg-good text-white' : active ? 'bg-brand-600 text-white' : 'bg-surface-3 text-ink-3',
              )}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className={cn('block text-sm font-semibold', active ? 'text-brand-ink' : 'text-ink')}>
                <span className="sr-only">Step {i + 1}: </span>
                {s.label}
              </span>
              <span className="block truncate text-xs text-ink-3">{s.hint}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
