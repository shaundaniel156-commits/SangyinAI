import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getClass } from '../../data/classes'
import type { Student } from '../../types'
import { Avatar } from '../ui/Avatar'
import { ProgressBar, toneForScore } from '../ui/ProgressBar'
import { StatusBadge } from '../ui/StatusBadge'

/**
 * Scannable student row: who, class, subject/topic, progress and status, plus an optional
 * recommended action. Stacks on small screens, aligns into columns from `md` up.
 */
export function StudentProgressRow({ student, action }: { student: Student; action?: ReactNode }) {
  const focus = student.competencies.find((c) => c.name === student.currentFocus)
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-5 py-3.5 transition-colors hover:bg-surface-2/60 sm:px-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
      <Link to={`/students/${student.id}`} className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
        <Avatar initials={student.initials} size="sm" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink hover:text-brand-ink">{student.name}</span>
          <span className="block truncate text-xs text-ink-3">{getClass(student.classId)?.name}</span>
        </span>
      </Link>
      <span className="col-span-2 min-w-0 md:col-span-1">
        <span className="block truncate text-sm text-ink">{student.currentFocus}</span>
        {focus && <span className="block text-xs text-ink-3">{focus.subject}</span>}
      </span>
      <span className="col-span-2 flex items-center gap-2 md:col-span-1">
        <ProgressBar value={student.average} tone={toneForScore(student.average)} size="sm" className="flex-1" srLabel={`${student.name} average`} />
        <span className="tabular w-9 text-right text-xs font-semibold text-ink">{student.average}%</span>
      </span>
      <span>
        {student.needsSupport ? (
          <StatusBadge tone="bad">Needs support</StatusBadge>
        ) : student.average >= 70 ? (
          <StatusBadge tone="good">On track</StatusBadge>
        ) : (
          <StatusBadge tone="warn">Developing</StatusBadge>
        )}
      </span>
      {action ? <span className="justify-self-end">{action}</span> : <span className="hidden md:block" />}
    </li>
  )
}
