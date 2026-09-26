import { BookOpenCheck, GraduationCap, Target, Users, type LucideIcon } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { REPORT_TITLES, type ReportType } from './types'

const OPTIONS: { id: ReportType; icon: LucideIcon; hint: string }[] = [
  { id: 'student', icon: GraduationCap, hint: 'One learner’s competencies and results' },
  { id: 'class', icon: Users, hint: 'Class average, trend and gaps' },
  { id: 'subject', icon: BookOpenCheck, hint: 'Subject averages across classes' },
  { id: 'competency', icon: Target, hint: 'Competency mastery across classes' },
]

export function ReportTypePicker({ value, onChange }: { value: ReportType; onChange: (t: ReportType) => void }) {
  return (
    <div role="radiogroup" aria-label="Report type" className="grid grid-cols-2 gap-2">
      {OPTIONS.map(({ id, icon: Icon, hint }) => {
        const active = id === value
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            className={cn(
              'flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors',
              active ? 'border-brand-500 bg-brand-soft' : 'border-line bg-surface hover:border-line-strong',
            )}
          >
            <Icon className={cn('size-4', active ? 'text-brand-ink' : 'text-ink-3')} aria-hidden />
            <span className={cn('text-sm font-medium', active ? 'text-brand-ink' : 'text-ink')}>{REPORT_TITLES[id].replace(' report', '')}</span>
            <span className="text-xs text-ink-3">{hint}</span>
          </button>
        )
      })}
    </div>
  )
}
