import { AlertCircle, CheckCircle2, CircleDot, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { LEVEL_LABEL, LEVEL_LABEL_FRIENDLY } from '../../lib/competency'
import { cn } from '../../lib/cn'
import type { CompetencyLevel } from '../../types'

export type Tone = 'good' | 'warn' | 'bad' | 'info' | 'neutral' | 'accent'

const TONES: Record<Tone, string> = {
  good: 'bg-good-soft text-good-ink',
  warn: 'bg-warn-soft text-warn-ink',
  bad: 'bg-bad-soft text-bad-ink',
  info: 'bg-brand-soft text-brand-ink',
  neutral: 'bg-surface-3 text-ink-2',
  accent: 'bg-accent-50 text-accent-700 dark:bg-[#10302a] dark:text-[#7fd9c4]',
}

interface BadgeProps {
  tone?: Tone
  icon?: LucideIcon
  children: ReactNode
  className?: string
}

/** Small pill label. Colour is always paired with text (and usually an icon). */
export function StatusBadge({ tone = 'neutral', icon: Icon, children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium', TONES[tone], className)}>
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </span>
  )
}

export const LEVEL_TONE: Record<CompetencyLevel, Tone> = { strength: 'good', developing: 'warn', needs_support: 'bad' }
export const LEVEL_ICON: Record<CompetencyLevel, LucideIcon> = { strength: CheckCircle2, developing: CircleDot, needs_support: AlertCircle }

export function LevelBadge({ level, friendly = false }: { level: CompetencyLevel; friendly?: boolean }) {
  return (
    <StatusBadge tone={LEVEL_TONE[level]} icon={LEVEL_ICON[level]}>
      {friendly ? LEVEL_LABEL_FRIENDLY[level] : LEVEL_LABEL[level]}
    </StatusBadge>
  )
}

