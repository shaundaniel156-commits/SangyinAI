import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

interface StatCardProps {
  label: string
  value: ReactNode
  icon: LucideIcon
  hint?: ReactNode
  delta?: { value: string; direction: 'up' | 'down'; good: boolean }
  to?: string
  tone?: 'brand' | 'bad' | 'warn' | 'accent' | 'good'
  /** Compact tiles for summary rows (smaller number, no hint wrap). */
  size?: 'md' | 'sm'
}

const ICON_TONE = {
  brand: 'bg-brand-soft text-brand-ink',
  bad: 'bg-bad-soft text-bad-ink',
  warn: 'bg-warn-soft text-warn-ink',
  good: 'bg-good-soft text-good-ink',
  accent: 'bg-accent-50 text-accent-700 dark:bg-cyan-400/12 dark:text-cyan-300',
}

/** Key metric: large number, short description, icon and optional trend. */
export function StatCard({ label, value, icon: Icon, hint, delta, to, tone = 'brand', size = 'md' }: StatCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-2">{label}</p>
        <span className={cn('grid shrink-0 place-items-center rounded-xl', size === 'sm' ? 'size-8' : 'size-10', ICON_TONE[tone])}>
          <Icon className={size === 'sm' ? 'size-4' : 'size-5'} aria-hidden />
        </span>
      </div>
      <p className={cn('tabular font-bold tracking-tight text-ink', size === 'sm' ? 'mt-1 text-2xl' : 'mt-2 text-3xl sm:text-[2rem]')}>{value}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {delta && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
              delta.good ? 'bg-good-soft text-good-ink' : 'bg-bad-soft text-bad-ink',
            )}
          >
            {delta.direction === 'up' ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
            {delta.value}
          </span>
        )}
        {hint && <span className="text-ink-3">{hint}</span>}
      </div>
    </>
  )
  const base = cn(
    'card-glow animate-rise block rounded-2xl border border-line bg-surface/75 backdrop-blur-md',
    size === 'sm' ? 'p-4' : 'p-5',
  )
  return to ? (
    <Link to={to} className={base}>
      {content}
    </Link>
  ) : (
    <div className={base}>{content}</div>
  )
}
