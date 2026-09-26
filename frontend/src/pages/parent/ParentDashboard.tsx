import { AlertTriangle, Bell, Brain, CheckCircle2, ChevronRight, Clock, Flame, HeartHandshake, MessageSquare, Sparkles, Target, TrendingUp, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AchievementList } from '../../components/domain/AchievementList'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { ProgressBar, toneForScore } from '../../components/ui/ProgressBar'
import { StatCard } from '../../components/ui/StatCard'
import { useAiAssessments } from '../../context/AiAssessmentsContext'
import { useSession } from '../../context/SessionContext'
import { LEARNING_STREAK_DAYS, RECENT_ACHIEVEMENTS } from '../../data/practice'
import { formatDate } from '../../lib/format'
import { timeOfDayGreeting } from '../../lib/greeting'
import { cn } from '../../lib/cn'
import { ChildPicker } from './components/ChildPicker'
import { getChildSummary } from './components/childSummary'
import { useSelectedChild } from './components/useSelectedChild'

/** Parent home: understand your child's progress at a glance, then how to help. */
export function ParentDashboard() {
  const { user } = useSession()
  const { children, child, setChildId } = useSelectedChild()
  const summary = getChildSummary(child)
  const firstTip = summary.tips[0]
  const { items } = useAiAssessments()
  const fromTeacher = items.filter((a) => a.status === 'sent' && a.shareWithParents && a.parentNote && a.studentIds.includes(child.id))
  const focusScore = child.competencies.find((c) => c.name === child.currentFocus)
  const needsAttention = child.competencies.filter((c) => c.level === 'needs_support').length
  const firstName = child.name

  return (
    <>
      <PageHeader hero title={`${timeOfDayGreeting()}, ${user.name} 👋`} description="Here’s how your children are progressing this week.">
        <div className="space-y-4">
          {children.length > 1 && <ChildPicker childList={children} value={child.id} onChange={setChildId} />}
          <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard size="sm" label="Children" value={children.length} icon={Users} hint="Linked to your account" to="/parent/children" />
            <StatCard
              size="sm"
              label="Overall progress"
              value={`${child.average}%`}
              icon={TrendingUp}
              tone="good"
              delta={child.trend !== 0 ? { value: `${Math.abs(child.trend)} pts`, direction: child.trend > 0 ? 'up' : 'down', good: child.trend > 0 } : undefined}
              hint="vs last term"
              to="/parent/progress"
            />
            <StatCard size="sm" label="Needs attention" value={needsAttention} icon={AlertTriangle} tone={needsAttention ? 'bad' : 'good'} hint={`areas for ${firstName}`} />
            <StatCard size="sm" label="Learning streak" value={`${LEARNING_STREAK_DAYS} days`} icon={Flame} tone="warn" hint="of practice in a row" />
          </div>
        </div>
      </PageHeader>

      <div className="stagger grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-12">
        <Card tier="primary" className="md:col-span-2 xl:col-span-8">
          <CardBody className="sm:p-7">
            <div className="flex items-center gap-2 text-sm font-medium text-brand-ink">
              <Brain className="size-4" aria-hidden />
              Current Learning Focus
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{summary.focus}</h2>
            <p className="mt-1.5 text-[15px] text-ink-2">
              {firstName} is currently working on understanding {summary.focus.toLowerCase()}
              {focusScore ? ` in ${focusScore.subject}` : ''}.
            </p>

            {focusScore && (
              <div className="mt-5 max-w-lg">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-ink-3">Progress in this topic</span>
                  <span className="tabular font-semibold text-ink">{focusScore.score}%</span>
                </div>
                <ProgressBar value={focusScore.score} tone={toneForScore(focusScore.score)} srLabel={`${summary.focus} progress`} />
              </div>
            )}

            {firstTip && (
              <div className="mt-6 flex gap-3 rounded-xl border border-line bg-surface-2/60 p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-good-soft text-good-ink">
                  <HeartHandshake className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">Suggested activity · {firstTip.title}</p>
                  <p className="mt-0.5 text-sm text-ink-2">{firstTip.tip}</p>
                  <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-ink-3">
                    <Clock className="size-3.5" aria-hidden />
                    About {firstTip.minutes} minutes
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink to="/parent/focus" icon={<Target className="size-4" aria-hidden />}>
                View Learning Focus
              </ButtonLink>
              <ButtonLink to="/parent/home-support" variant="secondary" icon={<Sparkles className="size-4" aria-hidden />}>
                Get Practice Activity
              </ButtonLink>
            </div>
          </CardBody>
        </Card>

        <Card className="md:col-span-2 xl:col-span-4">
          <CardHeader title="Recent achievements" description="Worth celebrating together" icon={<Sparkles aria-hidden />} />
          <AchievementList items={RECENT_ACHIEVEMENTS} formatDate={formatDate} />
        </Card>

        {fromTeacher.length > 0 && (
          <Card className="md:col-span-2 xl:col-span-12">
            <CardHeader
              title="From your child’s teacher"
              description="Practice your child’s teacher has approved, with a note on how you can help"
              icon={<HeartHandshake aria-hidden />}
            />
            <ul className="divide-y divide-line">
              {fromTeacher.map((a) => (
                <li key={a.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">{a.title}</p>
                    <span className="text-xs text-ink-3">
                      {a.questions.length} questions · due {formatDate(a.dueDate)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-2">{a.parentNote}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="xl:col-span-4">
          <CardHeader title="Doing well" description="Areas where your child is doing well" icon={<CheckCircle2 aria-hidden />} />
          <ul className="space-y-2 p-5 sm:p-6">
            {summary.strengths.length ? (
              summary.strengths.map((t) => (
                <li key={t.competencyId} className="flex items-center gap-3 rounded-xl bg-good-soft/60 px-3 py-2.5">
                  <CheckCircle2 className="size-5 shrink-0 text-good" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{t.name}</span>
                    <span className="block text-xs text-ink-3">{t.subject}</span>
                  </span>
                  <span className="text-xs font-medium text-good-ink">Doing well</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-ink-3">Strengths will appear here as your child completes more classwork.</li>
            )}
          </ul>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader title="Areas to improve" description="Where a little extra practice will help" icon={<Target aria-hidden />} />
          <ul className="space-y-2 p-5 sm:p-6">
            {summary.needsPractice.length ? (
              summary.needsPractice.map((t) => {
                const attention = t.level === 'needs_support'
                return (
                  <li key={t.competencyId} className="flex items-center gap-3 rounded-xl bg-surface-2/60 px-3 py-2.5">
                    <span className={cn('size-2.5 shrink-0 rounded-full', attention ? 'bg-bad shadow-[0_0_10px_var(--color-bad)]' : 'bg-warn')} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">{t.name}</span>
                      <span className={cn('block text-xs', attention ? 'text-bad-ink' : 'text-warn-ink')}>{attention ? 'Needs attention' : 'Developing'}</span>
                    </span>
                    {attention && (
                      <Link to="/parent/home-support" className="shrink-0 rounded-lg border border-line-strong px-2.5 py-1 text-xs font-semibold text-brand-ink hover:border-brand-400/50">
                        Practice now
                      </Link>
                    )}
                  </li>
                )
              })
            ) : (
              <li className="text-sm text-ink-3">No areas need extra practice right now.</li>
            )}
          </ul>
        </Card>

        <Card tier="tertiary" className="md:col-span-2 xl:col-span-4">
          <CardHeader title="Keep up to date" icon={<Bell aria-hidden />} />
          <nav aria-label="Parent quick links" className="grid gap-2 p-5 sm:p-6">
            <QuickLink to="/parent/progress" icon={TrendingUp} title="School updates" text="Progress reports for each subject" />
            <QuickLink to="/notifications" icon={MessageSquare} title="Messages from school" text="Updates from your child’s teacher" />
            <QuickLink to="/parent/children" icon={Users} title="My children" text="Switch between your children" />
          </nav>
        </Card>
      </div>
    </>
  )
}

function QuickLink({ to, icon: Icon, title, text }: { to: string; icon: typeof Users; title: string; text: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-line bg-surface/60 px-3 py-3 transition-all hover:-translate-y-0.5 hover:border-brand-400/40 hover:bg-surface-3/70"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="block truncate text-xs text-ink-3">{text}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
    </Link>
  )
}
