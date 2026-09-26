import { ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/cn'

export interface HierarchyStep {
  kind: string
  value?: string
}

/**
 * Breadcrumb of the curriculum hierarchy:
 * Framework → Level → Subject → Topic → Competency → Learning Objective.
 * Steps not yet selected are shown as muted placeholders.
 */
export function HierarchyPath({ steps }: { steps: HierarchyStep[] }) {
  return (
    <nav aria-label="Curriculum hierarchy">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
        {steps.map((s, i) => (
          <li key={s.kind} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-ink-3" aria-hidden />}
            <span
              className={cn(
                'inline-flex flex-col rounded-md px-2 py-1 leading-tight',
                s.value ? 'bg-surface-2' : 'border border-dashed border-line',
              )}
              aria-current={s.value && !steps[i + 1]?.value ? 'location' : undefined}
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-3">{s.kind}</span>
              <span className={cn('max-w-56 truncate', s.value ? 'font-medium text-ink' : 'text-ink-3')}>{s.value ?? '—'}</span>
            </span>
          </li>
        ))}
      </ol>
    </nav>
  )
}
