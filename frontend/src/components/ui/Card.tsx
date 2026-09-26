import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Visual hierarchy for cards:
 * - primary: hero content (learning focus, key insight) — blue-tinted glass, stronger border
 * - secondary: the default supporting card
 * - tertiary: small lists / metadata — flatter, no shadow
 */
export type CardTier = 'primary' | 'secondary' | 'tertiary'

const TIER: Record<CardTier, string> = {
  primary:
    'border-brand-400/30 bg-linear-to-br from-brand-500/16 via-surface/85 to-surface/85 shadow-[0_18px_48px_-24px_rgb(37_99_235/0.55)]',
  secondary: 'border-line bg-surface/75 shadow-[0_12px_32px_-20px_rgb(0_0_0/0.6)]',
  tertiary: 'border-line bg-surface-2/55',
}

interface CardProps {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'article'
  tier?: CardTier
}

export function Card({ children, className, as: Tag = 'section', tier = 'secondary' }: CardProps) {
  return <Tag className={cn('card-glow animate-rise rounded-2xl border backdrop-blur-md', TIER[tier], className)}>{children}</Tag>
}

interface CardHeaderProps {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  icon?: ReactNode
}

export function CardHeader({ title, description, action, icon }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink [&>svg]:size-4">{icon}</div>}
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
          {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-5 sm:p-6', className)}>{children}</div>
}
