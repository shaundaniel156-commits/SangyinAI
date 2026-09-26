import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarList } from '../../components/charts/BarList'
import { ChartContainer } from '../../components/charts/ChartContainer'
import { LineChart } from '../../components/charts/LineChart'
import { AssessmentStatusBadge } from '../../components/domain/AssessmentCard'
import { Card, CardHeader } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { FilterBar } from '../../components/ui/FilterBar'
import { PageHeader } from '../../components/ui/PageHeader'
import { toneForScore } from '../../components/ui/ProgressBar'
import { useSession } from '../../context/SessionContext'
import { getClass, getClassCompetencyAverages } from '../../data/classes'
import { getClassTrend } from '../../data/performance'
import { DEMO_SCHOOL } from '../../data/school'
import { assessmentsInScope, classesInScope } from '../../data/selectors'
import { getStudentsByClass } from '../../data/students'
import { levelFromScore } from '../../lib/competency'
import { formatDate, formatSignedPoints } from '../../lib/format'
import type { Subject } from '../../types'

const SERIES_COLORS = ['var(--color-series-1)', 'var(--color-series-2)', 'var(--color-series-3)']

export function PerformancePage() {
  const { role } = useSession()
  const navigate = useNavigate()
  const classes = classesInScope(role)
  const [classId, setClassId] = useState(classes[0]?.id ?? '')
  const [subject, setSubject] = useState<Subject>('Mathematics')
  const [term, setTerm] = useState(DEMO_SCHOOL.termOptions[DEMO_SCHOOL.termOptions.length - 1]!)

  const cls = getClass(classId)
  const students = getStudentsByClass(classId)
  const competencies = getClassCompetencyAverages(classId)
  const subjectComps = competencies.filter((c) => c.subject === subject)
  const subjectAverages = (['Mathematics', 'English'] as Subject[]).map((s) => {
    const list = competencies.filter((c) => c.subject === s)
    return { subject: s, value: Math.round(list.reduce((a, c) => a + c.average, 0) / Math.max(list.length, 1)) }
  })
  const history = useMemo(
    () => assessmentsInScope(role).filter((a) => a.classId === classId).sort((a, b) => b.date.localeCompare(a.date)),
    [role, classId],
  )
  const distribution = subjectComps.map((c) => {
    const levels = students.map((s) => levelFromScore(s.competencies.find((x) => x.competencyId === c.id)?.score ?? 0))
    return {
      ...c,
      strength: levels.filter((l) => l === 'strength').length,
      developing: levels.filter((l) => l === 'developing').length,
      support: levels.filter((l) => l === 'needs_support').length,
    }
  })
  const trendSeries = classes.slice(0, 3).map((c, i) => ({ name: c.name, points: getClassTrend(c.id), color: SERIES_COLORS[i]! }))

  return (
    <>
      <PageHeader title="Performance" description="How classes are progressing across subjects, competencies and assessments." />
      <FilterBar
        className="mb-6"
        filters={[
          { id: 'class', label: 'Class', value: classId, onChange: setClassId, options: classes.map((c) => ({ value: c.id, label: c.name })) },
          {
            id: 'subject',
            label: 'Subject',
            value: subject,
            onChange: (v) => setSubject(v as Subject),
            options: [
              { value: 'Mathematics', label: 'Mathematics' },
              { value: 'English', label: 'English' },
            ],
          },
          { id: 'term', label: 'Term', value: term, onChange: setTerm, options: DEMO_SCHOOL.termOptions.map((t) => ({ value: t, label: t })) },
        ]}
      />

      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        <Indicator label="Class average" value={`${cls?.average ?? 0}%`} />
        <Indicator label="Change since last term" value={formatSignedPoints(cls?.trend ?? 0)} tone={(cls?.trend ?? 0) >= 0 ? 'good' : 'bad'} />
        <Indicator label={`Strongest area · ${subject}`} value={[...subjectComps].sort((a, b) => b.average - a.average)[0]?.name ?? '—'} small />
        <Indicator label={`Weakest area · ${subject}`} value={[...subjectComps].sort((a, b) => a.average - b.average)[0]?.name ?? '—'} small />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartContainer
          className="xl:col-span-2"
          title="Performance trends"
          description="Class averages across recent assessments (%)"
          table={{
            headers: ['Month', ...trendSeries.map((s) => s.name)],
            rows: (trendSeries[0]?.points ?? []).map((p, i) => [p.label, ...trendSeries.map((s) => `${s.points[i]?.value}%`)]),
          }}
        >
          <LineChart ariaLabel="Class average trends" series={trendSeries} min={40} max={80} />
        </ChartContainer>
        <ChartContainer
          title="Subject performance"
          description={`${cls?.name} · average mastery`}
          table={{ headers: ['Subject', 'Average'], rows: subjectAverages.map((s) => [s.subject, `${s.value}%`]) }}
        >
          <BarList items={subjectAverages.map((s) => ({ id: s.subject, label: s.subject, value: s.value }))} />
          <p className="mt-4 text-xs text-ink-3">Science and Social Studies have no competency data in this demo.</p>
        </ChartContainer>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartContainer
          title="Competency performance"
          description={`${subject} · class average mastery`}
          table={{ headers: ['Competency', 'Average'], rows: subjectComps.map((c) => [c.name, `${c.average}%`]) }}
        >
          <BarList items={subjectComps.map((c) => ({ id: c.id, label: c.name, value: c.average, tone: toneForScore(c.average) }))} />
        </ChartContainer>

        <ChartContainer
          title="Progress indicators"
          description="Students at each level per competency"
          table={{
            headers: ['Competency', 'Strength', 'Developing', 'Needs support'],
            rows: distribution.map((d) => [d.name, d.strength, d.developing, d.support]),
          }}
        >
          <ul className="mb-4 flex flex-wrap gap-4 text-xs text-ink-2">
            <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-good" aria-hidden />Strength</li>
            <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-warn" aria-hidden />Developing</li>
            <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-bad" aria-hidden />Needs support</li>
          </ul>
          <ul className="space-y-3.5">
            {distribution.map((d) => {
              const total = Math.max(students.length, 1)
              return (
                <li key={d.id} title={`${d.name}: ${d.strength} strength, ${d.developing} developing, ${d.support} needs support`}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="text-ink">{d.name}</span>
                    <span className="tabular text-ink-3">{d.support} need support</span>
                  </div>
                  <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${d.name}: ${d.strength} strength, ${d.developing} developing, ${d.support} needs support`}>
                    {d.strength > 0 && <span className="bg-good" style={{ width: `${(d.strength / total) * 100}%` }} />}
                    {d.developing > 0 && <span className="bg-warn" style={{ width: `${(d.developing / total) * 100}%` }} />}
                    {d.support > 0 && <span className="bg-bad" style={{ width: `${(d.support / total) * 100}%` }} />}
                  </div>
                </li>
              )
            })}
          </ul>
        </ChartContainer>
      </div>

      <Card className="mt-6">
        <CardHeader title="Assessment history" description={`${cls?.name} · ${term}`} />
        <DataTable
          caption="Assessment history"
          rows={history}
          rowKey={(a) => a.id}
          onRowClick={(a) => navigate(`/assessments/${a.id}`)}
          columns={[
            { id: 'title', header: 'Assessment', cell: (a) => <span className="font-medium">{a.title}</span> },
            { id: 'type', header: 'Type', hideBelow: 'md', className: 'text-ink-2', cell: (a) => a.type },
            { id: 'date', header: 'Date', hideBelow: 'sm', className: 'whitespace-nowrap text-ink-2', cell: (a) => formatDate(a.date) },
            { id: 'avg', header: 'Average', align: 'right', cell: (a) => <span className="tabular font-medium">{a.average !== undefined ? `${a.average}%` : '—'}</span> },
            { id: 'status', header: 'Status', hideBelow: 'sm', cell: (a) => <AssessmentStatusBadge status={a.status} /> },
          ]}
        />
      </Card>
      <p className="mt-4 text-xs text-ink-3">All figures are demo data for UI preview. Term selection is illustrative; historical terms are not loaded in this prototype.</p>
    </>
  )
}

function Indicator({ label, value, tone, small }: { label: string; value: string; tone?: 'good' | 'bad'; small?: boolean }) {
  return (
    <div className="card-glow rounded-xl border border-line bg-surface p-4">
      <p className="text-sm text-ink-3">{label}</p>
      <p className={`tabular mt-1 font-semibold ${small ? 'text-lg' : 'text-2xl'} ${tone === 'good' ? 'text-good-ink' : tone === 'bad' ? 'text-bad-ink' : 'text-ink'}`}>{value}</p>
    </div>
  )
}
