import { BookMarked, Check, Star } from 'lucide-react'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { cn } from '../../../lib/cn'
import type { CurriculumFramework, CurriculumFrameworkData } from '../../../types'

interface FrameworkPickerProps {
  frameworks: CurriculumFrameworkData[]
  value: CurriculumFramework
  onChange: (id: CurriculumFramework) => void
  primary: CurriculumFramework
  /** Number of in-scope classes using each framework. */
  classCounts: Record<CurriculumFramework, number>
}

/** Two selectable framework cards (radio group). */
export function FrameworkPicker({ frameworks, value, onChange, primary, classCounts }: FrameworkPickerProps) {
  return (
    <div role="radiogroup" aria-label="Curriculum framework" className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {frameworks.map((f) => {
        const active = f.id === value
        const loaded = f.levels.filter((l) => l.subjects.some((s) => s.topics.length > 0)).length
        return (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(f.id)}
            className={cn(
              'flex h-full flex-col rounded-xl border bg-surface p-4 text-left transition-colors sm:p-5',
              active ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-line hover:border-line-strong',
            )}
          >
            <div className="flex w-full items-start justify-between gap-3">
              <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', f.id === 'uganda' ? 'bg-brand-soft text-brand-ink' : 'bg-accent-50 text-accent-700 dark:bg-[#10302a] dark:text-[#7fd9c4]')}>
                <BookMarked className="size-5" aria-hidden />
              </span>
              <span
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full border',
                  active ? 'border-brand-600 bg-brand-600 text-white' : 'border-line-strong',
                )}
                aria-hidden
              >
                {active && <Check className="size-3.5" />}
              </span>
            </div>
            <p className="mt-3 font-semibold text-ink">{f.name}</p>
            <p className="mt-1 text-sm text-ink-2">{f.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-3">
              {f.id === primary && (
                <StatusBadge tone="info" icon={Star}>
                  School primary
                </StatusBadge>
              )}
              <span className="tabular">{f.levels.length} levels listed</span>
              <span aria-hidden>·</span>
              <span className="tabular">{loaded} with demo content</span>
              <span aria-hidden>·</span>
              <span className="tabular">
                {classCounts[f.id]} {classCounts[f.id] === 1 ? 'class' : 'classes'} in your scope
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
