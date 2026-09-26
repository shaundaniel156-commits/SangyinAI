import { GraduationCap, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Avatar } from '../../components/ui/Avatar'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { FilterBar } from '../../components/ui/FilterBar'
import { PageHeader } from '../../components/ui/PageHeader'
import { ProgressBar, toneForScore } from '../../components/ui/ProgressBar'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useSession } from '../../context/SessionContext'
import { getClass } from '../../data/classes'
import { classesInScope, studentsInScope } from '../../data/selectors'
import { DEMO_COMPETENCIES } from '../../data/students'
import { formatSignedPoints } from '../../lib/format'
import { cn } from '../../lib/cn'

export function StudentsPage() {
  const { role } = useSession()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [classId, setClassId] = useState('all')
  const [focus, setFocus] = useState('all')
  const query = params.get('q') ?? ''
  const status = params.get('support') === '1' ? 'support' : (params.get('status') ?? 'all')

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key === 'status') next.delete('support')
    setParams(next, { replace: true })
  }

  const all = studentsInScope(role)
  const classes = classesInScope(role)
  const rows = useMemo(
    () =>
      all.filter(
        (s) =>
          (classId === 'all' || s.classId === classId) &&
          (focus === 'all' || s.currentFocus === focus) &&
          (status === 'all' || (status === 'support' ? s.needsSupport : !s.needsSupport)) &&
          s.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [all, classId, focus, status, query],
  )

  return (
    <>
      <PageHeader
        title="Students"
        description={role === 'admin' ? 'All students enrolled at the school.' : 'Students in the classes you teach.'}
        meta={
          <>
            <StatusBadge icon={Users}>{all.length} students</StatusBadge>
            <StatusBadge tone="bad">{all.filter((s) => s.needsSupport).length} needing support</StatusBadge>
          </>
        }
      />
      <Card>
        <div className="border-b border-line p-4">
          <FilterBar
            search={<SearchBar value={query} onChange={(v) => setParam('q', v)} placeholder="Search by name…" label="Search students" />}
            filters={[
              {
                id: 'class',
                label: 'Class',
                value: classId,
                onChange: setClassId,
                options: [{ value: 'all', label: 'All classes' }, ...classes.map((c) => ({ value: c.id, label: c.name }))],
              },
              {
                id: 'status',
                label: 'Support status',
                value: status,
                onChange: (v) => setParam('status', v === 'all' ? '' : v),
                options: [
                  { value: 'all', label: 'All students' },
                  { value: 'support', label: 'Needs support' },
                  { value: 'ontrack', label: 'On track' },
                ],
              },
              {
                id: 'focus',
                label: 'Current focus',
                value: focus,
                onChange: setFocus,
                options: [
                  { value: 'all', label: 'Any learning focus' },
                  ...DEMO_COMPETENCIES.filter((c) => c.subject === 'Mathematics').map((c) => ({ value: c.name, label: c.name })),
                ],
              },
            ]}
          />
        </div>
        <DataTable
          key={`${classId}-${focus}-${status}-${query}`}
          caption="Students"
          rows={rows}
          rowKey={(s) => s.id}
          onRowClick={(s) => navigate(`/students/${s.id}`)}
          pageSize={12}
          empty={<EmptyState icon={GraduationCap} title="No students match your filters" description="Try a different search or clear the filters." />}
          columns={[
            {
              id: 'name',
              header: 'Student',
              cell: (s) => (
                <div className="flex items-center gap-3">
                  <Avatar initials={s.initials} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{s.name}</p>
                    <p className="truncate text-xs text-ink-3 md:hidden">{getClass(s.classId)?.name}</p>
                  </div>
                </div>
              ),
            },
            { id: 'class', header: 'Class', hideBelow: 'md', className: 'whitespace-nowrap text-ink-2', cell: (s) => getClass(s.classId)?.name },
            {
              id: 'average',
              header: 'Average',
              cell: (s) => (
                <div className="flex min-w-24 items-center gap-2.5">
                  <ProgressBar value={s.average} tone={toneForScore(s.average)} size="sm" className="hidden flex-1 sm:block" srLabel={`${s.name} average`} />
                  <span className="tabular w-9 text-right font-medium">{s.average}%</span>
                </div>
              ),
            },
            {
              id: 'trend',
              header: 'Change',
              hideBelow: 'lg',
              align: 'right',
              cell: (s) => <span className={cn('tabular', s.trend >= 0 ? 'text-good-ink' : 'text-bad-ink')}>{formatSignedPoints(s.trend)}</span>,
            },
            { id: 'focus', header: 'Current focus', hideBelow: 'sm', className: 'whitespace-nowrap text-ink-2', cell: (s) => s.currentFocus },
            {
              id: 'status',
              header: 'Status',
              hideBelow: 'sm',
              cell: (s) => (s.needsSupport ? <StatusBadge tone="bad">Needs support</StatusBadge> : <StatusBadge tone="good">On track</StatusBadge>),
            },
          ]}
        />
      </Card>
    </>
  )
}
