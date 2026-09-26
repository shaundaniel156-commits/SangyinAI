import { Avatar } from '../../../components/ui/Avatar'
import { getClass } from '../../../data/classes'
import { cn } from '../../../lib/cn'
import type { Student } from '../../../types'

interface ChildPickerProps {
  childList: Student[]
  value: string
  onChange: (id: string) => void
}

/** Profile-style selector for the parent's children: avatar, class and overall progress. */
export function ChildPicker({ childList, value, onChange }: ChildPickerProps) {
  return (
    <div role="radiogroup" aria-label="Choose a child" className="no-print flex flex-wrap gap-3">
      {childList.map((c) => {
        const active = c.id === value
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(c.id)}
            className={cn(
              'flex min-w-56 flex-1 items-center gap-3 rounded-2xl border px-4 py-3 text-left backdrop-blur-md transition-all sm:flex-none',
              active
                ? 'border-brand-400/60 bg-brand-500/15 shadow-[0_0_0_1px_rgb(96_165_250/0.25),0_10px_30px_-12px_rgb(37_99_235/0.7)]'
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10',
            )}
          >
            <Avatar initials={c.initials} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">{c.name}</span>
              <span className="block truncate text-xs text-white/60">{getClass(c.classId)?.name}</span>
            </span>
            <span className="text-right">
              <span className="tabular block text-lg font-bold text-white">{c.average}%</span>
              <span className="block text-[11px] text-white/55">overall</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
