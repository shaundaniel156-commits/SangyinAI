import { ChevronRight, Stethoscope } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DiagnosticCard, LevelSplit } from '../../components/domain/DiagnosticCard'
import { Avatar } from '../../components/ui/Avatar'
import { Card, CardHeader } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { DemoNotice } from '../../components/ui/DemoNotice'
import { EmptyState } from '../../components/ui/EmptyState'
import { FilterBar } from '../../components/ui/FilterBar'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useSession } from '../../context/SessionContext'
import { getClass } from '../../data/classes'
import { classesInScope, diagnosticsInScope } from '../../data/selectors'
import { DEMO_COMPETENCIES, getStudent } from '../../data/students'
import { formatShortDate } from '../../lib/format'

export function DiagnosticsPage() {
  const { role } = useSession()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [classId, setClassId] = useState('all')
  const [level, setLevel] = useState('support')
  const [area, setArea] = useState('all')

  const reports = diagnosticsInScope(role)
  const priority = [...reports].filter((r) => r.needsSupport.length >= 2).slice(0, 3)
  const rows = useMemo(
    () =>
      reports.filter((r) => {
        const s = getStudent(r.studentId)
        return (
          (classId === 'all' || s?.classId === classId) &&
          (level === 'all' || (level === 'support' ? r.needsSupport.length > 0 : r.needsSupport.length === 0)) &&
          (area === 'all' || r.identifiedAreas.includes(area)) &&
          (s?.name.toLowerCase().includes(query.trim().toLowerCase()) ?? false)
        )
      }),
    [reports, classId, level, area, query],
  )

  return (
    <>
      <PageHeader
        title="Diagnostics"
        description="Competency-level diagnosis for each student and class, built from assessments, assignments, quizzes and teacher observations."
        meta={
          <>
            <StatusBadge icon={Stethoscope}>{reports.length} reports · Mathematics</StatusBadge>
            <StatusBadge tone="bad">{reports.filter((r) => r.needsSupport.length > 0).length} with areas requiring support</StatusBadge>
          </>
        }
      />

      {priority.length > 0 && (
        <section aria-labelledby="priority-heading" className="mb-6">
          <h2 id="priority-heading" className="mb-3 text-sm font-semibold text-ink">
            Priority — more than one area requiring support
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {priority.map((r) => (
              <DiagnosticCard key={r.id} report={r} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="class-diagnosis-heading" className="mb-6">
        <h2 id="class-diagnosis-heading" className="mb-3 text-sm font-semibold text-ink">
          By class — common gaps to inform whole-class instruction
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {classesInScope(role).map((c) => {
            const classReports = reports.filter((r) => getStudent(r.studentId)?.classId === c.id)
            const needing = classReports.filter((r) => r.needsSupport.length > 0).length
            return (
              <Link key={c.id} to={`/classes/${c.id}`} className="card-glow group flex flex-col rounded-xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate font-medium text-ink">{c.name}</p>
                  <ChevronRight className="size-4 shrink-0 text-ink-3 group-hover:text-ink" aria-hidden />
                </div>
                <p className="mt-0.5 text-sm text-ink-3">
                  {needing} of {classReports.length} students with an area requiring support
                </p>
                <ul className="mt-4 space-y-1.5">
                  {c.commonGaps.slice(0, 3).map((g) => (
                    <li key={g.competency} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-ink-2">{g.competency}</span>
                      <StatusBadge tone="bad" className="tabular">
                        {g.studentsAffected} students
                      </StatusBadge>
                    </li>
                  ))}
                </ul>
              </Link>
            )
          })}
        </div>
      </section>

      <Card>
        <CardHeader title="All diagnostic reports" />
        <div className="border-b border-line p-4">
          <FilterBar
            search={<SearchBar value={query} onChange={setQuery} placeholder="Search student…" label="Search diagnostic reports" />}
            filters={[
              {
                id: 'class',
                label: 'Class',
                value: classId,
                onChange: setClassId,
                options: [{ value: 'all', label: 'All classes' }, ...classesInScope(role).map((c) => ({ value: c.id, label: c.name }))],
              },
              {
                id: 'level',
                label: 'Support level',
                value: level,
                onChange: setLevel,
                options: [
                  { value: 'support', label: 'Requiring support' },
                  { value: 'none', label: 'No area requiring support' },
                  { value: 'all', label: 'All reports' },
                ],
              },
              {
                id: 'area',
                label: 'Identified area',
                value: area,
                onChange: setArea,
                options: [
                  { value: 'all', label: 'Any learning area' },
                  ...DEMO_COMPETENCIES.filter((c) => c.subject === 'Mathematics').map((c) => ({ value: c.name, label: c.name })),
                ],
              },
            ]}
          />
        </div>
        <DataTable
          key={`${classId}-${level}-${area}-${query}`}
          caption="Diagnostic reports"
          rows={rows}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`/diagnostics/${r.id}`)}
          empty={<EmptyState icon={Stethoscope} title="No reports match these filters" />}
          columns={[
            {
              id: 'student',
              header: 'Student',
              cell: (r) => {
                const s = getStudent(r.studentId)
                return (
                  <div className="flex items-center gap-3">
                    <Avatar initials={s?.initials ?? ''} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s?.name}</p>
                      <p className="truncate text-xs text-ink-3">{getClass(s?.classId ?? '')?.name}</p>
                    </div>
                  </div>
                )
              },
            },
            {
              id: 'areas',
              header: 'Identified learning areas',
              hideBelow: 'sm',
              cell: (r) => (
                <div className="flex flex-wrap gap-1.5">
                  {r.identifiedAreas.length ? (
                    r.identifiedAreas.map((a) => (
                      <StatusBadge key={a} tone={r.needsSupport.includes(a) ? 'bad' : 'warn'}>
                        {a}
                      </StatusBadge>
                    ))
                  ) : (
                    <span className="text-ink-3">None</span>
                  )}
                </div>
              ),
            },
            {
              id: 'split',
              header: 'Competency levels',
              hideBelow: 'lg',
              cell: (r) => (
                <div className="w-40">
                  <LevelSplit report={r} />
                  <p className="tabular mt-1 text-xs text-ink-3">
                    {r.strengths.length} · {r.developing.length} · {r.needsSupport.length}
                  </p>
                </div>
              ),
            },
            { id: 'date', header: 'Updated', hideBelow: 'md', className: 'whitespace-nowrap text-ink-2', cell: (r) => formatShortDate(r.generatedOn) },
          ]}
        />
      </Card>
      <DemoNotice className="mt-6">Diagnostic results shown are sample data. The diagnostic engine is not connected in this prototype.</DemoNotice>
    </>
  )
}
