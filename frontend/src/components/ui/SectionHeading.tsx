import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Heading for a group of cards on a dashboard: title, optional one-line description and action. */
export function SectionHeading({ title, description, action, className, id }: { title: string; description?: string; action?: ReactNode; className?: string; id?: string }) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-lg font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
      </div>
      {action}
    </div>
  )
}
