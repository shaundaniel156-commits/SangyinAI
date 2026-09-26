import { DEMO_LEVEL_THRESHOLDS } from '../../lib/competency'
import { cn } from '../../lib/cn'

type ProgressTone = 'brand' | 'good' | 'warn' | 'bad'

const FILL: Record<ProgressTone, string> = {
  brand: 'bg-linear-to-r from-brand-500 to-sky-400',
  good: 'bg-good',
  warn: 'bg-warn',
  bad: 'bg-bad',
}

const TRACK: Record<ProgressTone, string> = {
  brand: 'bg-brand-100 dark:bg-brand-900/60',
  good: 'bg-good-soft',
  warn: 'bg-warn-soft',
  bad: 'bg-bad-soft',
}

interface ProgressBarProps {
  value: number
  max?: number
  tone?: ProgressTone
  label?: string
  showValue?: boolean
  /** Accessible name when no visible label is shown. */
  srLabel?: string
  size?: 'sm' | 'md'
  className?: string
}

export function ProgressBar({ value, max = 100, tone = 'brand', label, showValue, srLabel, size = 'md', className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
          {label && <span className="truncate text-ink-2">{label}</span>}
          {showValue && <span className="tabular font-medium text-ink">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? srLabel}
        className={cn('w-full overflow-hidden rounded-full', TRACK[tone], size === 'sm' ? 'h-1.5' : 'h-2')}
      >
        <div className={cn('animate-grow h-full rounded-full transition-[width]', FILL[tone])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function toneForScore(score: number): ProgressTone {
  if (score >= DEMO_LEVEL_THRESHOLDS.strength) return 'good'
  if (score >= DEMO_LEVEL_THRESHOLDS.developing) return 'warn'
  return 'bad'
}
