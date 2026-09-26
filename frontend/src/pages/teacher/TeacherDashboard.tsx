import { AlertTriangle, BookOpen, Bot, ClipboardList, GraduationCap, Plus, Sparkles, Users, Wand2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BarList } from '../../components/charts/BarList'
import { ChartContainer } from '../../components/charts/ChartContainer'
import { LineChart } from '../../components/charts/LineChart'
import { ActivityFeed } from '../../components/domain/ActivityFeed'
import { AiReviewCard } from '../../components/domain/AiReviewCard'
import { AssessmentCard } from '../../components/domain/AssessmentCard'
import { ClassOverviewTable } from '../../components/domain/ClassOverviewTable'
import { StudentProgressRow } from '../../components/domain/StudentProgressRow'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatCard } from '../../components/ui/StatCard'
import { useGuidanceReview } from '../../context/GuidanceReviewContext'
import { useSession } from '../../context/SessionContext'
import { TEACHER_ACTIVITY } from '../../data/activity'
import { getGuidanceForStudent } from '../../data/guidance'
import { getClassTrend } from '../../data/performance'
import { DEMO_SCHOOL } from '../../data/school'
import { assessmentsInScope, classesInScope, commonGapsInScope, guidanceInScope, studentsInScope } from '../../data/selectors'

const SERIES_COLORS = ['var(--color-series-1)', 'var(--color-series-2)', 'var(--color-series-3)']

/** Teacher home: classroom overview, who needs attention, and AI teaching insight. */
export function TeacherDashboard() {
  const { user } = useSession()
  const { resolve } = useGuidanceReview()
  const classes = classesInScope('teacher')
  const students = studentsInScope('teacher')
  const needingSupport = students.filter((s) => s.needsSupport)
  const assessments = assessmentsInScope('teacher')
  const assignments = assessments.filter((a) => a.type === 'Assignment')
  const awaitingScores = assessments.filter((a) => a.status === 'awaiting_scores').length
  const pendingGuidance = guidanceInScope('teacher').map(resolve).filter((g) => g.status === 'pending_review')
  const gaps = commonGapsInScope('teacher').slice(0, 5)
  const topGap = gaps[0]
  const recentAssessments = [...assessments].filter((a) => a.status !== 'draft').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)
  const attention = [...needingSupport].sort((a, b) => a.average - b.average).slice(0, 5)

  return (
    <>
      <PageHeader
        hero
        title={`Welcome back, ${user.name}`}
        description={`Here is an overview of your classes for ${DEMO_SCHOOL.currentTerm}, ${DEMO_SCHOOL.academicYear}.`}
        actions={
          <>
            <ButtonLink to="/guidance" variant="secondary" icon={<Sparkles className="size-4" aria-hidden />}>
              Review guidance
            </ButtonLink>
            <ButtonLink to="/assessments/new" variant="secondary" icon={<Plus className="size-4" aria-hidden />}>
              New assessment
            </ButtonLink>
            <ButtonLink to="/ai-assessments/new" icon={<Wand2 className="size-4" aria-hidden />}>
              Generate with AI
            </ButtonLink>
          </>
        }
      >
        <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard label="My students" value={students.length} icon={GraduationCap} hint={`across ${classes.length} classes`} to="/students" />
          <StatCard label="Classes" value={classes.length} icon={BookOpen} tone="accent" hint="Mathematics" to="/classes" />
          <StatCard label="Assignments" value={assignments.length} icon={ClipboardList} tone="warn" hint={`${awaitingScores} awaiting scores`} to="/assessments" />
          <StatCard label="Needs attention" value={needingSupport.length} icon={AlertTriangle} tone="bad" hint="at least one area requiring support" to="/students?support=1" />
        </div>
      </PageHeader>

      <div className="stagger grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-12">
        <ChartContainer
          className="md:col-span-2 xl:col-span-8"
          title="Recent performance"
          description="Class average across recent assessments (%)"
          table={{
            headers: ['Month', ...classes.map((c) => c.name)],
            rows: getClassTrend(classes[0]!.id).map((p, i) => [p.label, ...classes.map((c) => `${getClassTrend(c.id)[i]?.value ?? '—'}%`)]),
          }}
        >
          <LineChart
            ariaLabel="Line chart of class averages over recent months"
            min={40}
            max={80}
            series={classes.map((c, i) => ({ name: c.name, points: getClassTrend(c.id), color: SERIES_COLORS[i % SERIES_COLORS.length]! }))}
          />
        </ChartContainer>

        {topGap && (
          <section className="card-glow animate-rise relative flex flex-col overflow-hidden rounded-2xl border border-violet-400/25 bg-linear-to-br from-violet-500/16 via-surface/85 to-cyan-500/8 p-6 backdrop-blur-md md:col-span-2 xl:col-span-4">
            <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-cyan-500/15 blur-3xl" aria-hidden />
            <div className="relative flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-linear-to-br from-violet-500 to-cyan-500 text-white shadow-[0_6px_18px_-6px_rgb(139_92_246/0.8)]">
                <Bot className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">AI teaching insight</p>
                <p className="text-sm text-ink-3">From your latest results</p>
              </div>
            </div>
            <p className="relative mt-5 text-xl font-semibold leading-snug text-ink">
              {topGap.studentsAffected} students are struggling with <span className="text-cyan-300">{topGap.competency}</span>.
            </p>
            <p className="relative mt-2 text-sm text-ink-2">
              It’s the most common gap across your classes. A short, targeted practice set can help the whole group.
              {pendingGuidance.length > 0 && ` ${pendingGuidance.length} AI teaching plans are also waiting for your review.`}
            </p>
            <div className="relative mt-auto flex flex-wrap gap-2 pt-6">
              <ButtonLink to="/students?support=1" variant="secondary" size="sm" icon={<Users className="size-4" aria-hidden />}>
                View students
              </ButtonLink>
              <ButtonLink to="/ai-assessments/new" size="sm" icon={<Wand2 className="size-4" aria-hidden />}>
                Plan class practice
              </ButtonLink>
            </div>
          </section>
        )}

        <Card className="md:col-span-2 xl:col-span-8">
          <CardHeader
            title="Students needing attention"
            description="Lowest recent averages, with a recommended next step"
            icon={<AlertTriangle aria-hidden />}
            action={
              <Link to="/students?support=1" className="text-sm font-medium text-brand-ink hover:underline">
                View all
              </Link>
            }
          />
          <ul className="divide-y divide-line">
            {attention.map((s) => {
              const plan = getGuidanceForStudent(s.id)
              return (
                <StudentProgressRow
                  key={s.id}
                  student={s}
                  action={
                    plan ? (
                      <ButtonLink to={`/guidance/${plan.id}`} size="sm" variant="secondary">
                        Review plan
                      </ButtonLink>
                    ) : (
                      <ButtonLink to={`/students/${s.id}`} size="sm" variant="secondary">
                        View profile
                      </ButtonLink>
                    )
                  }
                />
              )
            })}
          </ul>
        </Card>

        <AiReviewCard
          className="md:col-span-2 xl:col-span-4"
          title="AI guidance awaiting review"
          description={`${pendingGuidance.length} plans need your decision`}
          plans={pendingGuidance}
          limit={3}
        />

        <Card className="md:col-span-2 xl:col-span-6">
          <CardHeader
            title="Recent assignments & assessments"
            icon={<ClipboardList aria-hidden />}
            action={
              <Link to="/assessments" className="text-sm font-medium text-brand-ink hover:underline">
                View all
              </Link>
            }
          />
          <div className="divide-y divide-line px-2 py-1">
            {recentAssessments.map((a) => (
              <AssessmentCard key={a.id} assessment={a} />
            ))}
          </div>
        </Card>

        <Card className="md:col-span-2 xl:col-span-6">
          <CardHeader
            title="Common learning gaps"
            description="Students with an area requiring support, all your classes"
            icon={<Sparkles aria-hidden />}
            action={
              <Link to="/ai-assessments/new" className="text-sm font-medium text-brand-ink hover:underline">
                Plan class practice
              </Link>
            }
          />
          <div className="p-5 sm:p-6">
            <BarList
              valueSuffix=""
              max={students.length}
              items={gaps.map((g) => ({ id: g.competency, label: g.competency, meta: g.subject, value: g.studentsAffected, tone: 'bad' }))}
            />
            <p className="mt-4 text-xs text-ink-3">Number of students · demo data</p>
          </div>
        </Card>

        <Card className="md:col-span-2 xl:col-span-8">
          <CardHeader title="Class performance overview" description="Average across recent assessments and change since last term" />
          <ClassOverviewTable classes={classes} />
        </Card>

        <Card tier="tertiary" className="md:col-span-2 xl:col-span-4">
          <CardHeader title="Recent activity" />
          <ActivityFeed items={TEACHER_ACTIVITY} />
        </Card>
      </div>
    </>
  )
}
