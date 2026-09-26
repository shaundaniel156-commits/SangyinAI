import { ClipboardList, Sparkles, Stethoscope, Target, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChartContainer } from '../../components/charts/ChartContainer'
import { LineChart } from '../../components/charts/LineChart'
import { AssessmentStatusBadge } from '../../components/domain/AssessmentCard'
import { CompetencyList } from '../../components/domain/CompetencyList'
import { GuidanceStatusBadge } from '../../components/domain/GuidanceStatusBadge'
import { Avatar } from '../../components/ui/Avatar'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { getStudentAssessmentHistory } from '../../data/assessments'
import { getClass } from '../../data/classes'
import { FRAMEWORK_LABEL } from '../../data/curriculum'
import { getDiagnosticForStudent } from '../../data/diagnostics'
import { getGuidanceForStudent } from '../../data/guidance'
import { getStudentTrend } from '../../data/performance'
import { getStudent } from '../../data/students'
import { getTeacher } from '../../data/teachers'
import { formatShortDate, formatSignedPoints } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { Student, Subject } from '../../types'

function subjectAverage(student: Student, subject: Subject): number | null {
  const scores = student.competencies.filter((c) => c.subject === subject).map((c) => c.score)
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
}

export function StudentProfilePage() {
  const { id = '' } = useParams()
  const student = getStudent(id)

  if (!student) {
    return (
      <Card>
        <EmptyState
          icon={UserRound}
          title="Student not found"
          description="This student record does not exist in the demo data."
          action={<ButtonLink to="/students">Back to students</ButtonLink>}
        />
      </Card>
    )
  }

  const cls = getClass(student.classId)
  const teacher = cls && getTeacher(cls.teacherId)
  const diagnostic = getDiagnosticForStudent(student.id)
  const guidance = getGuidanceForStudent(student.id)
  const history = getStudentAssessmentHistory(student.id, student.classId)
  const trend = getStudentTrend(student.average, student.trend)

  return (
    <>
      <PageHeader
        back={{ to: '/students', label: 'Students' }}
        title={
          <span className="flex items-center gap-3">
            <Avatar initials={student.initials} size="lg" />
            <span>
              {student.name}
              <span className="mt-0.5 block text-sm font-normal text-ink-3">
                {cls?.name} · {FRAMEWORK_LABEL[student.framework]}
              </span>
            </span>
          </span>
        }
        actions={
          <>
            {diagnostic && (
              <ButtonLink to={`/diagnostics/${diagnostic.id}`} variant="secondary" icon={<Stethoscope className="size-4" aria-hidden />}>
                Diagnostic report
              </ButtonLink>
            )}
            {guidance && (
              <ButtonLink to={`/guidance/${guidance.id}`} icon={<Sparkles className="size-4" aria-hidden />}>
                Teaching guidance
              </ButtonLink>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        <SummaryTile label="Overall average" value={`${student.average}%`} />
        <SummaryTile
          label="Change since last term"
          value={<span className={student.trend >= 0 ? 'text-good-ink' : 'text-bad-ink'}>{formatSignedPoints(student.trend)}</span>}
        />
        <SummaryTile label="Class teacher" value={<span className="text-base">{teacher?.name ?? '—'}</span>} />
        <SummaryTile label="Parent / guardian" value={<span className="text-base">{student.guardianName}</span>} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartContainer
          className="xl:col-span-2"
          title="Performance overview"
          description="Overall average across recent assessments (%)"
          table={{ headers: ['Month', 'Average'], rows: trend.map((p) => [p.label, `${p.value}%`]) }}
        >
          <LineChart ariaLabel={`${student.name} overall average trend`} series={[{ name: 'Overall average', points: trend, color: 'var(--color-series-1)' }]} min={20} max={100} />
        </ChartContainer>

        <Card className="flex flex-col">
          <CardHeader title="Current learning focus" icon={<Target className="size-5" aria-hidden />} />
          <CardBody className="flex flex-1 flex-col">
            <p className="text-xl font-semibold text-ink">{student.currentFocus}</p>
            <p className="mt-1 text-sm text-ink-3">Mathematics</p>
            {guidance ? (
              <div className="mt-4 rounded-lg border border-line bg-surface-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">Teaching guidance</p>
                  <GuidanceStatusBadge status={guidance.status} />
                </div>
                <p className="mt-1 text-sm text-ink-2">{guidance.teachingApproach.method}</p>
                <p className="mt-1 text-sm text-ink-3">{guidance.pacing}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink-3">No guidance plan is needed at the moment — no area currently requires support.</p>
            )}
            <div className="mt-auto pt-4">
              <p className="text-sm font-medium text-ink">Subjects</p>
              <ul className="mt-2 divide-y divide-line text-sm">
                {student.subjects.map((subject) => {
                  const avg = subjectAverage(student, subject)
                  return (
                    <li key={subject} className="flex items-center justify-between py-2">
                      <span className="text-ink-2">{subject}</span>
                      <span className="tabular font-medium text-ink">{avg === null ? <span className="font-normal text-ink-3">No data yet</span> : `${avg}%`}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Competency areas" description="Current mastery estimate per area (demo data)" />
          <CardBody>
            {(['Mathematics', 'English'] as Subject[]).map((subject) => (
              <div key={subject} className="mb-6 last:mb-0">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-3">{subject}</h3>
                <CompetencyList competencies={student.competencies.filter((c) => c.subject === subject)} />
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent assessments" icon={<ClipboardList className="size-5" aria-hidden />} />
          {history.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No results yet" />
          ) : (
            <ul className="divide-y divide-line">
              {history.map(({ assessment, score, percent }) => (
                <li key={assessment.id}>
                  <Link to={`/assessments/${assessment.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{assessment.title}</p>
                      <p className="text-sm text-ink-3">
                        {assessment.type} · {formatShortDate(assessment.date)}
                      </p>
                    </div>
                    {percent === null ? (
                      <AssessmentStatusBadge status={assessment.status} />
                    ) : (
                      <div className="text-right">
                        <p className={cn('tabular text-sm font-semibold', percent >= 70 ? 'text-good-ink' : percent >= 50 ? 'text-warn-ink' : 'text-bad-ink')}>
                          {percent}%
                        </p>
                        <p className="tabular text-xs text-ink-3">
                          {score}/{assessment.maxScore}
                        </p>
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <p className="mt-6 text-xs text-ink-3">
        <StatusBadge>Demo record</StatusBadge> <span className="ml-1">This profile is generated sample data for UI review.</span>
      </p>
    </>
  )
}

function SummaryTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="card-glow rounded-xl border border-line bg-surface p-4">
      <p className="text-sm text-ink-3">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold text-ink">{value}</p>
    </div>
  )
}
