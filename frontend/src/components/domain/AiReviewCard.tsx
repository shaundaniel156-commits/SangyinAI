import { Bot, TrendingDown, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getStudent } from '../../data/students'
import { cn } from '../../lib/cn'
import type { GuidancePlan } from '../../types'
import { ButtonLink } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'

interface AiReviewCardProps {
  plans: GuidancePlan[]
  title?: string
  description?: string
  className?: string
  limit?: number
}

/**
 * "AI Guided Review" — the assistant's queue of plans awaiting a teacher decision. Styled apart
 * from ordinary lists (violet/cyan glass) so the AI feature is recognisable across dashboards.
 */
export function AiReviewCard({ plans, title = 'AI Guided Review', description, className, limit = 4 }: AiReviewCardProps) {
  const shown = plans.slice(0, limit)
  return (
    <section
      className={cn(
        'card-glow animate-rise relative overflow-hidden rounded-2xl border border-violet-400/25 bg-linear-to-br from-violet-500/14 via-surface/85 to-cyan-500/8 backdrop-blur-md',
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-violet-500/15 blur-3xl" aria-hidden />
      <div className="relative flex items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-linear-to-br from-violet-500 to-cyan-500 text-white shadow-[0_6px_18px_-6px_rgb(139_92_246/0.8)]">
            <Bot className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
            <p className="mt-0.5 text-sm text-ink-3">{description ?? `${plans.length} plans need a teacher decision`}</p>
          </div>
        </div>
        <Link to="/guidance" className="shrink-0 text-sm font-medium text-brand-ink hover:underline">
          View all
        </Link>
      </div>
      <ul className="relative space-y-2 p-4 sm:p-5">
        {shown.length === 0 && <li className="px-1 text-sm text-ink-3">Nothing waiting — all plans have been reviewed.</li>}
        {shown.map((p) => {
          const s = getStudent(p.studentId)
          const improving = (s?.trend ?? 0) > 0
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface/60 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{s?.name}</p>
                <p className="truncate text-xs text-ink-2">{p.competencyGap}</p>
                <StatusBadge tone={improving ? 'good' : 'bad'} icon={improving ? TrendingUp : TrendingDown} className="mt-1.5">
                  {improving ? 'Improving' : 'Needs attention'}
                </StatusBadge>
              </div>
              <ButtonLink to={`/guidance/${p.id}`} variant="secondary" size="sm">
                Review
              </ButtonLink>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
