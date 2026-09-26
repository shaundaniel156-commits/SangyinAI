import { FlaskConical } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Inline notice that marks prototype-only behaviour or demo data, so reviewers
 * never mistake placeholder content for real functionality.
 */
export function DemoNotice({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start gap-2.5 rounded-lg border border-dashed border-line-strong bg-surface-2 px-3.5 py-2.5 text-sm text-ink-2', className)}>
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
      <div>{children}</div>
    </div>
  )
}
