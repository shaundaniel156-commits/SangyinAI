import { AlertTriangle, BookOpenCheck, ClipboardList, Eye, GraduationCap, PencilRuler, School, Sparkles, UserCheck, UserPlus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BarList } from '../../components/charts/BarList'
import { ChartContainer } from '../../components/charts/ChartContainer'
import { ColumnChart } from '../../components/charts/ColumnChart'
import { LineChart } from '../../components/charts/LineChart'
import { ActivityFeed } from '../../components/domain/ActivityFeed'
import { AiReviewCard } from '../../components/domain/AiReviewCard'
import { AssessmentCard } from '../../components/domain/AssessmentCard'
import { ClassOverviewTable } from '../../components/domain/ClassOverviewTable'
import { StudentProgressRow } from '../../components/domain/StudentProgressRow'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { StatCard } from '../../components/ui/StatCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useGuidanceReview } from '../../context/GuidanceReviewContext'
import { useSession } from '../../context/SessionContext'
import { ADMIN_ACTIVITY } from '../../data/activity'
import { ASSESSMENTS } from '../../data/assessments'
import { CLASSES } from '../../data/classes'
import { FRAMEWORK_LABEL } from '../../data/curriculum'
import { GUIDANCE_PLANS } from '../../data/guidance'
import { SCHOOL_TREND, SUBJECT_AVERAGES, USAGE_INDICATORS } from '../../data/performance'
import { DEMO_SCHOOL } from '../../data/school'
import { STUDENTS } from '../../data/students'
import { TEACHERS } from '../../data/teachers'
import { DataQualityCard } from './components/DataQualityCard'
import { FrameworkSummaryCard } from './components/FrameworkSummaryCard'
import { PilotCriteriaCard } from './components/PilotCriteriaCard'

/** School-wide analytics and management for administrators. */
export function AdminDashboard() {
  const { user } = useSession()
  const { resolve } = useGuidanceReview()
  const activeTeachers = TEACHERS.filter((t) => t.status === 'active').length
  const invitedTeachers = TEACHERS.filter((t) => t.status === 'invited').length
  const cambridgeClasses = CLASSES.filter((c) => c.framework === 'cambridge').length
  const needingSupport = STUDENTS.filter((s) => s.needsSupport)
  const usage = USAGE_INDICATORS
  const last = SCHOOL_TREND[SCHOOL_TREND.length - 1]!.value
  const prev = SCHOOL_TREND[SCHOOL_TREND.length - 2]?.value ?? last
  const pendingPlans = GUIDANCE_PLANS.map(resolve).filter((p) => p.status === 'pending_review')
  const watchList = [...needingSupport].sort((a, b) => a.average - b.average).slice(0, 6)
  const recentAssessments = [...ASSESSMENTS].filter((a) => a.status !== 'draft').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return (
    <>
      <PageHeader
        hero
        title={`Welcome back, ${user.name}`}
        description={`School-wide overview for ${DEMO_SCHOOL.name} · ${DEMO_SCHOOL.currentTerm}, ${DEMO_SCHOOL.academicYear}.`}
        meta={<StatusBadge tone="info">Primary framework: {FRAMEWORK_LABEL[DEMO_SCHOOL.primaryFramework]}</StatusBadge>}
        actions={
          <>
            <ButtonLink to="/admin/structure" variant="secondary" icon={<BookOpenCheck className="size-4" aria-hidden />}>
              Academic structure
            </ButtonLink>
            <ButtonLink to="/admin/users" icon={<UserPlus className="size-4" aria-hidden />}>
              Manage users
            </ButtonLink>
          </>
        }
      >
        <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="Students"
            value={STUDENTS.length}
            icon={GraduationCap}
            hint={`across ${CLASSES.length} classes`}
            delta={{ value: `${Math.abs(last - prev)} pts avg`, direction: last >= prev ? 'up' : 'down', good: last >= prev }}
            to="/students"
          />
          <StatCard label="Teachers" value={TEACHERS.length} icon={School} tone="accent" hint={`${activeTeachers} active · ${invitedTeachers} invited`} to="/admin/teachers" />
          <StatCard label="Classes" value={CLASSES.length} icon={Users} hint={`${CLASSES.length - cambridgeClasses} National · ${cambridgeClasses} Cambridge`} to="/classes" />
          <StatCard label="Needs attention" value={needingSupport.length} icon={AlertTriangle} tone="bad" hint="students requiring support" to="/students?support=1" />
        </div>
      </PageHeader>

      <div className="stagger grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-12">
        <ChartContainer
          className="md:col-span-2 xl:col-span-8"
          title="Recent performance"
          description="School-wide average across terms (%)"
          table={{ headers: ['Term', 'Average'], rows: SCHOOL_TREND.map((p) => [p.label, `${p.value}%`]) }}
        >
          <LineChart ariaLabel="Line chart of the school-wide average by term" min={40} max={80} series={[{ name: 'School average', points: SCHOOL_TREND, color: 'var(--color-series-1)' }]} />
        </ChartContainer>
        <ChartContainer
          className="md:col-span-2 xl:col-span-4"
          title="Subject performance"
          description="Current term, all classes"
          table={{ headers: ['Subject', 'Average'], rows: SUBJECT_AVERAGES.map((s) => [s.subject, `${s.value}%`]) }}
        >
          <BarList items={SUBJECT_AVERAGES.map((s) => ({ id: s.subject, label: s.subject, value: s.value }))} />
        </ChartContainer>

        <Card className="md:col-span-2 xl:col-span-8">
          <CardHeader
            title="Student performance"
            description="Lowest averages across the school — who may need extra support"
            icon={<GraduationCap aria-hidden />}
            action={
              <Link to="/students?support=1" className="text-sm font-medium text-brand-ink hover:underline">
                View all
              </Link>
            }
          />
          <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-x-3 border-b border-line px-6 py-2 text-xs font-medium uppercase tracking-wide text-ink-3 md:grid">
            <span>Student</span>
            <span>Focus</span>
            <span>Average</span>
            <span>Status</span>
            <span />
          </div>
          <ul className="divide-y divide-line">
            {watchList.map((s) => (
              <StudentProgressRow key={s.id} student={s} />
            ))}
          </ul>
        </Card>

        <AiReviewCard className="md:col-span-2 xl:col-span-4" plans={pendingPlans} description={`${pendingPlans.length} teaching plans awaiting teacher review`} />

        <Card className="md:col-span-2 xl:col-span-7">
          <CardHeader
            title="Recent assessments"
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

        <Card className="md:col-span-2 xl:col-span-5">
          <CardHeader title="Recent activity" icon={<Sparkles aria-hidden />} />
          <ActivityFeed items={ADMIN_ACTIVITY} />
        </Card>
      </div>

      <section aria-labelledby="usage-heading" className="mt-10">
        <SectionHeading id="usage-heading" title="System usage" description="Adoption across teachers, parents and students this week" />
        <div className="stagger grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="grid grid-cols-2 gap-4 xl:col-span-5">
            <StatCard size="sm" label="Active teachers" value={`${usage.weeklyActiveTeachers.value}/${usage.weeklyActiveTeachers.total}`} icon={UserCheck} hint="signed in this week" />
            <StatCard size="sm" label="Parent views" value={usage.parentViews.value} icon={Eye} tone="accent" hint={`of ${usage.parentViews.total} learners`} />
            <StatCard size="sm" label="Guidance reviewed" value={usage.guidanceReviewed} icon={Sparkles} tone="good" hint="by teachers" />
            <StatCard size="sm" label="Practice completed" value={usage.practiceCompleted} icon={PencilRuler} tone="warn" hint="student activities" />
          </div>
          <ChartContainer
            className="xl:col-span-7"
            title="Weekly activity"
            description="Platform sessions per school day"
            table={{ headers: ['Day', 'Sessions'], rows: usage.weeklyActivity.map((d) => [d.label, d.value]) }}
          >
            <ColumnChart data={usage.weeklyActivity} ariaLabel="Column chart of sessions per weekday" height={180} />
          </ChartContainer>
        </div>
      </section>

      <section aria-labelledby="governance-heading" className="mt-10">
        <SectionHeading id="governance-heading" title="Pilot & data governance" description="Targets, curriculum configuration and data completeness" />
        <PilotCriteriaCard />
        <div className="stagger mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <FrameworkSummaryCard classes={CLASSES} />
          <DataQualityCard />
        </div>
      </section>

      <Card className="mt-10">
        <CardHeader title="Class performance overview" description="Average across recent assessments and change since last term" />
        <ClassOverviewTable classes={CLASSES} showTeacher />
      </Card>
    </>
  )
}
