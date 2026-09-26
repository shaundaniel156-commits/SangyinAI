import { useNavigate } from 'react-router-dom'
import { getTeacher } from '../../data/teachers'
import { getStudentsByClass } from '../../data/students'
import { formatSignedPoints } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { SchoolClass } from '../../types'
import { DataTable } from '../ui/DataTable'
import { ProgressBar, toneForScore } from '../ui/ProgressBar'

/** Table summarising class performance; rows open the class details. */
export function ClassOverviewTable({ classes, showTeacher = false }: { classes: SchoolClass[]; showTeacher?: boolean }) {
  const navigate = useNavigate()
  return (
    <DataTable
      caption="Class performance overview"
      rows={classes}
      rowKey={(c) => c.id}
      onRowClick={(c) => navigate(`/classes/${c.id}`)}
      columns={[
        {
          id: 'name',
          header: 'Class',
          cell: (c) => (
            <div>
              <p className="whitespace-nowrap font-medium text-ink">{c.name}</p>
              <p className="text-xs text-ink-3">{c.level}</p>
            </div>
          ),
        },
        ...(showTeacher ? [{ id: 'teacher', header: 'Class teacher', hideBelow: 'md' as const, cell: (c: SchoolClass) => getTeacher(c.teacherId)?.name }] : []),
        { id: 'framework', header: 'Framework', hideBelow: 'lg', className: 'whitespace-nowrap', cell: (c) => <span className="text-ink-2">{c.framework === 'uganda' ? 'Uganda (NCDC)' : 'Cambridge'}</span> },
        { id: 'students', header: 'Students', align: 'right', hideBelow: 'sm', cell: (c) => <span className="tabular">{c.studentCount}</span> },
        {
          id: 'average',
          header: 'Average',
          cell: (c) => (
            <div className="flex min-w-28 items-center gap-3">
              <ProgressBar value={c.average} tone={toneForScore(c.average)} size="sm" className="flex-1" srLabel={`${c.name} average`} />
              <span className="tabular w-9 text-right font-medium">{c.average}%</span>
            </div>
          ),
        },
        {
          id: 'trend',
          header: 'Change',
          align: 'right',
          hideBelow: 'sm',
          cell: (c) => (
            <span className={cn('tabular font-medium', c.trend >= 0 ? 'text-good-ink' : 'text-bad-ink')}>{formatSignedPoints(c.trend)}</span>
          ),
        },
        {
          id: 'support',
          header: 'Need support',
          align: 'right',
          hideBelow: 'md',
          cell: (c) => <span className="tabular">{getStudentsByClass(c.id).filter((s) => s.needsSupport).length}</span>,
        },
      ]}
    />
  )
}
