import { ClipboardList, FileUp, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AssessmentStatusBadge } from '../../components/domain/AssessmentCard'
import { ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { FilterBar } from '../../components/ui/FilterBar'
import { PageHeader } from '../../components/ui/PageHeader'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { SearchBar } from '../../components/ui/SearchBar'
import { Tabs } from '../../components/ui/Tabs'
import { useSession } from '../../context/SessionContext'
import { getClass } from '../../data/classes'
import { assessmentsInScope, classesInScope } from '../../data/selectors'
import { formatDate } from '../../lib/format'
import type { AssessmentStatus, AssessmentType } from '../../types'

type TabId = 'all' | AssessmentStatus
const TYPES: AssessmentType[] = ['Test', 'Quiz', 'Assignment', 'Teacher Observation']

export function AssessmentsPage() {
  const { role } = useSession()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabId>('all')
  const [query, setQuery] = useState('')
  const [classId, setClassId] = useState('all')
  const [type, setType] = useState('all')

  const all = assessmentsInScope(role)
  const count = (s: AssessmentStatus) => all.filter((a) => a.status === s).length
  const rows = useMemo(
    () =>
      [...all]
        .filter(
          (a) =>
            (tab === 'all' || a.status === tab) &&
            (classId === 'all' || a.classId === classId) &&
            (type === 'all' || a.type === type) &&
            a.title.toLowerCase().includes(query.trim().toLowerCase()),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [all, tab, classId, type, query],
  )

  return (
    <>
      <PageHeader
        title="Assessments"
        description="Tests, quizzes, assignments and teacher observations that feed each student’s diagnostic profile."
        actions={
          <>
            <ButtonLink to="/assessments/import" variant="secondary" icon={<FileUp className="size-4" aria-hidden />}>
              Import results
            </ButtonLink>
            <ButtonLink to="/assessments/new" icon={<Plus className="size-4" aria-hidden />}>
              Create assessment
            </ButtonLink>
          </>
        }
      />
      <Card>
        <div className="px-4 pt-2">
          <Tabs
            label="Assessment status"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'all', label: 'All', count: all.length },
              { id: 'completed', label: 'Completed', count: count('completed') },
              { id: 'awaiting_scores', label: 'Awaiting scores', count: count('awaiting_scores') },
              { id: 'scheduled', label: 'Scheduled', count: count('scheduled') },
              { id: 'draft', label: 'Drafts', count: count('draft') },
            ]}
          />
        </div>
        <div className="border-b border-line p-4">
          <FilterBar
            search={<SearchBar value={query} onChange={setQuery} placeholder="Search assessments…" label="Search assessments" />}
            filters={[
              {
                id: 'class',
                label: 'Class',
                value: classId,
                onChange: setClassId,
                options: [{ value: 'all', label: 'All classes' }, ...classesInScope(role).map((c) => ({ value: c.id, label: c.name }))],
              },
              {
                id: 'type',
                label: 'Type',
                value: type,
                onChange: setType,
                options: [{ value: 'all', label: 'All types' }, ...TYPES.map((t) => ({ value: t, label: t }))],
              },
            ]}
          />
        </div>
        <DataTable
          key={`${tab}-${classId}-${type}-${query}`}
          caption="Assessments"
          rows={rows}
          rowKey={(a) => a.id}
          onRowClick={(a) => navigate(`/assessments/${a.id}`)}
          empty={<EmptyState icon={ClipboardList} title="No assessments found" description="Try another filter, or create a new assessment." />}
          columns={[
            {
              id: 'title',
              header: 'Assessment',
              cell: (a) => (
                <div className="min-w-0">
                  <p className="font-medium text-ink">{a.title}</p>
                  <p className="text-xs text-ink-3">{a.topics.join(', ')}</p>
                </div>
              ),
            },
            { id: 'type', header: 'Type', hideBelow: 'md', className: 'whitespace-nowrap text-ink-2', cell: (a) => a.type },
            { id: 'class', header: 'Class', hideBelow: 'lg', className: 'whitespace-nowrap text-ink-2', cell: (a) => getClass(a.classId)?.name },
            { id: 'date', header: 'Date', hideBelow: 'sm', className: 'whitespace-nowrap text-ink-2', cell: (a) => formatDate(a.date) },
            {
              id: 'scores',
              header: 'Scores entered',
              hideBelow: 'lg',
              cell: (a) => {
                const total = getClass(a.classId)?.studentCount ?? 0
                return (
                  <div className="flex min-w-32 items-center gap-2.5">
                    <ProgressBar value={a.scoresEntered} max={Math.max(total, 1)} size="sm" className="flex-1" srLabel="Scores entered" />
                    <span className="tabular text-xs text-ink-3">
                      {a.scoresEntered}/{total}
                    </span>
                  </div>
                )
              },
            },
            {
              id: 'avg',
              header: 'Average',
              align: 'right',
              cell: (a) => <span className="tabular font-medium">{a.average !== undefined ? `${a.average}%` : '—'}</span>,
            },
            { id: 'status', header: 'Status', hideBelow: 'sm', cell: (a) => <AssessmentStatusBadge status={a.status} /> },
          ]}
        />
      </Card>
    </>
  )
}
