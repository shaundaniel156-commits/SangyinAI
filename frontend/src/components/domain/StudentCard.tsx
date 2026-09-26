import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getClass } from '../../data/classes'
import type { Student } from '../../types'
import { Avatar } from '../ui/Avatar'
import { StatusBadge } from '../ui/StatusBadge'

/** Compact student row with current focus, used in lists and dashboards. */
export function StudentCard({ student, showClass = true }: { student: Student; showClass?: boolean }) {
  const cls = getClass(student.classId)
  return (
    <Link to={`/students/${student.id}`} className="group flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-surface-2">
      <Avatar initials={student.initials} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{student.name}</p>
        <p className="truncate text-sm text-ink-3">
          {showClass && `${cls?.name} · `}Focus: {student.currentFocus}
        </p>
      </div>
      <StatusBadge tone={student.average >= 70 ? 'good' : student.average >= 50 ? 'warn' : 'bad'} className="tabular">
        {student.average}% avg
      </StatusBadge>
      <ChevronRight className="size-4 shrink-0 text-ink-3 group-hover:text-ink" aria-hidden />
    </Link>
  )
}
