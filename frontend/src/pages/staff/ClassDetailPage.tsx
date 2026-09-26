import { ClipboardList, GraduationCap, LifeBuoy, Mail, TrendingUp, Users } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { BarList } from '../../components/charts/BarList'
import { ChartContainer } from '../../components/charts/ChartContainer'
import { LineChart } from '../../components/charts/LineChart'
import { AssessmentCard } from '../../components/domain/AssessmentCard'
import { FrameworkBadge } from '../../components/domain/FrameworkBadge'
import { Avatar } from '../../components/ui/Avatar'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { ProgressBar, toneForScore } from '../../components/ui/ProgressBar'
import { StatCard } from '../../components/ui/StatCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { getAssessmentsByClass } from '../../data/assessments'
import { getClass, getClassCompetencyAverages } from '../../data/classes'
import { getClassTrend } from '../../data/performance'
import { getStudentsByClass } from '../../data/students'
import { getTeacher } from '../../data/teachers'
import { formatSignedPoints } from '../../lib/format'

export function ClassDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const cls = getClass(id)

  if (!cls) {
    return (
      <Card>
        <EmptyState icon={Users} title="Class not found" action={<ButtonLink to="/classes">Back to classes</ButtonLink>} />
      </Card>
    )
  }

  const students = getStudentsByClass(cls.id)
  const needing = students.filter((s) => s.needsSupport)
  const teacher = getTeacher(cls.teacherId)
  const assessments = [...getAssessmentsByClass(cls.id)].sort((a, b) => b.date.localeCompare(a.date))
  const trend = getClassTrend(cls.id)
  const competencyAverages = getClassCompetencyAverages(cls.id).filter((c) => c.subject === 'Mathematics')

  return (
    <>
      <PageHeader
        back={{ to: '/classes', label: 'Classes' }}
        title={cls.name}
        description={`${cls.level} · ${cls.subjects.join(', ')}`}
        meta={<FrameworkBadge framework={cls.framework} />}
        actions={
          <>
            <ButtonLink to="/reports" variant="secondary">
              Class report
            </ButtonLink>
            <ButtonLink to="/assessments/new" icon={<ClipboardList className="size-4" aria-hidden />}>
              New assessment
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-4">
        <StatCard label="Students" value={students.length} icon={GraduationCap} />
        <StatCard label="Class average" value={`${cls.average}%`} icon={TrendingUp} hint="Recent assessments" />
        <StatCard
          label="Change since last term"
          value={formatSignedPoints(cls.trend)}
          icon={TrendingUp}
          tone={cls.trend >= 0 ? 'accent' : 'bad'}
        />
        <StatCard label="Needing support" value={needing.length} icon={LifeBuoy} tone="bad" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartContainer
          className="xl:col-span-2"
          title="Class performance overview"
          description="Class average across recent assessments (%)"
          table={{ headers: ['Month', 'Average'], rows: trend.map((p) => [p.label, `${p.value}%`]) }}
        >
          <LineChart ariaLabel={`${cls.name} average trend`} series={[{ name: 'Class average', points: trend, color: 'var(--color-series-1)' }]} min={30} max={90} />
        </ChartContainer>

        <Card>
          <CardHeader title="Teacher information" />
          <CardBody>
            <div className="flex items-center gap-3">
              <Avatar initials={teacher?.initials ?? '?'} />
              <div className="min-w-0">
                <p className="font-medium text-ink">{teacher?.name}</p>
                <p className="text-sm text-ink-3">Class teacher · {teacher?.subjects.join(', ')}</p>
              </div>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-ink-2">
              <Mail className="size-4 text-ink-3" aria-hidden />
              {teacher?.email}
            </p>
            <div className="mt-6">
              <h3 className="text-sm font-medium text-ink">Common competency gaps</h3>
              <p className="text-xs text-ink-3">Students with an area requiring support</p>
              <ul className="mt-3 space-y-2">
                {cls.commonGaps.map((g) => (
                  <li key={g.competency} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                    <span className="text-ink">
                      {g.competency} <span className="text-ink-3">· {g.subject}</span>
                    </span>
                    <StatusBadge tone="bad" className="tabular">
                      {g.studentsAffected} students
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartContainer
          title="Competency performance"
          description="Class average mastery · Mathematics"
          table={{ headers: ['Competency', 'Average'], rows: competencyAverages.map((c) => [c.name, `${c.average}%`]) }}
        >
          <BarList items={competencyAverages.map((c) => ({ id: c.id, label: c.name, value: c.average, tone: toneForScore(c.average) }))} />
        </ChartContainer>

        <Card className="xl:col-span-2">
          <CardHeader title="Students" description={`${students.length} students in this class`} />
          <DataTable
            caption={`Students in ${cls.name}`}
            rows={[...students].sort((a, b) => a.average - b.average)}
            rowKey={(s) => s.id}
            onRowClick={(s) => navigate(`/students/${s.id}`)}
            pageSize={8}
            columns={[
              {
                id: 'name',
                header: 'Student',
                cell: (s) => (
                  <div className="flex items-center gap-3">
                    <Avatar initials={s.initials} size="sm" />
                    <span className="font-medium">{s.name}</span>
                  </div>
                ),
              },
              {
                id: 'avg',
                header: 'Average',
                cell: (s) => (
                  <div className="flex min-w-24 items-center gap-2.5">
                    <ProgressBar value={s.average} tone={toneForScore(s.average)} size="sm" className="hidden flex-1 sm:block" srLabel={`${s.name} average`} />
                    <span className="tabular w-9 text-right">{s.average}%</span>
                  </div>
                ),
              },
              { id: 'focus', header: 'Current focus', hideBelow: 'md', className: 'text-ink-2', cell: (s) => s.currentFocus },
              {
                id: 'status',
                header: 'Status',
                hideBelow: 'sm',
                cell: (s) => (s.needsSupport ? <StatusBadge tone="bad">Needs support</StatusBadge> : <StatusBadge tone="good">On track</StatusBadge>),
              },
            ]}
          />
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Recent assessments" />
        {assessments.length ? (
          <div className="grid grid-cols-1 gap-x-4 px-2 py-1 lg:grid-cols-2">
            {assessments.map((a) => (
              <AssessmentCard key={a.id} assessment={a} />
            ))}
          </div>
        ) : (
          <EmptyState icon={ClipboardList} title="No assessments yet" />
        )}
      </Card>
    </>
  )
}
