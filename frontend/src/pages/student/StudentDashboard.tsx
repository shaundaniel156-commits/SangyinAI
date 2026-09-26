import { ArrowRight, Award, BookOpenCheck, CheckCircle2, Clock, Flame, ListChecks, MessageSquareText, Play, Sparkles, Target, Timer, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AchievementList } from '../../components/domain/AchievementList'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { ProgressBar, toneForScore } from '../../components/ui/ProgressBar'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { StatCard } from '../../components/ui/StatCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAiAssessments } from '../../context/AiAssessmentsContext'
import { DEMO_IN_PROGRESS_ANSWERED, LEARNING_STREAK_DAYS, PRACTICE_ACTIVITIES, RECENT_ACHIEVEMENTS, STUDENT_FEEDBACK } from '../../data/practice'
import { DEMO_USERS } from '../../data/users'
import { formatShortDate } from '../../lib/format'
import type { PracticeActivity } from '../../types'
import { FeedbackControl } from './components/FeedbackControl'
import { PracticeActivityCard } from './components/PracticeActivityCard'
import { SamplePracticeModal } from './components/SamplePracticeModal'
import { getCurrentStudent, getLearningSequence } from './components/studentData'

/** Student home: the next thing to do first, then focus, progress and motivation. */
export function StudentDashboard() {
  const student = getCurrentStudent()
  const [open, setOpen] = useState<PracticeActivity | null>(null)
  const { items, attempts } = useAiAssessments()
  const steps = getLearningSequence(student)
  const done = steps.filter((s) => s.state === 'completed').length
  const current = PRACTICE_ACTIVITIES.find((a) => a.status === 'in_progress')
  const upNext = PRACTICE_ACTIVITIES.filter((a) => a.status === 'not_started').slice(0, 3)
  const completed = PRACTICE_ACTIVITIES.filter((a) => a.status === 'completed')
  const lastCompleted = [...completed].sort((a, b) => (b.completedOn ?? '').localeCompare(a.completedOn ?? ''))[0]
  const latestMessage = STUDENT_FEEDBACK[0]
  const focusScore = student.competencies.find((c) => c.name === student.currentFocus)

  // Teacher-approved assessments come first; otherwise continue or start regular practice.
  const mine = items.filter((a) => a.status === 'sent' && a.studentIds.includes(DEMO_USERS.student.id))
  const pendingFromTeacher = mine.find((a) => !attempts[a.id])
  const nextActivity = current ?? upNext[0]
  const teacherAnswered = mine.reduce((n, a) => n + (attempts[a.id]?.total ?? 0), 0)
  const questionsAnswered = completed.reduce((n, a) => n + a.questions, 0) + (current ? DEMO_IN_PROGRESS_ANSWERED : 0) + teacherAnswered
  const minutes = completed.reduce((n, a) => n + a.estimatedMinutes, 0)

  return (
    <>
      <PageHeader hero title={`Hi, ${student.name} 👋`} description="Here’s what you’re learning right now. Keep going — every bit of practice helps!" />

      <div className="stagger grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-12">
        <Card tier="primary" className="md:col-span-2 xl:col-span-7">
          <CardBody className="flex h-full flex-col sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-medium text-brand-ink">
                <Target className="size-4" aria-hidden />
                Your next activity
              </span>
              {pendingFromTeacher && (
                <StatusBadge tone="info" icon={Sparkles}>
                  New from your teacher
                </StatusBadge>
              )}
            </div>
            {pendingFromTeacher ? (
              <>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{pendingFromTeacher.title}</h2>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
                  <span className="inline-flex items-center gap-1.5">
                    <ListChecks className="size-4" aria-hidden />
                    {pendingFromTeacher.questions.length} questions
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-4" aria-hidden />
                    Due {formatShortDate(pendingFromTeacher.dueDate)}
                  </span>
                </p>
                <div className="mt-auto pt-6">
                  <ButtonLink to="/student/practice" size="lg" icon={<Play className="size-4" aria-hidden />}>
                    Start Practice <ArrowRight className="size-4" aria-hidden />
                  </ButtonLink>
                </div>
              </>
            ) : nextActivity ? (
              <>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{nextActivity.title}</h2>
                <p className="mt-1 text-sm text-ink-3">
                  {nextActivity.subject} · {nextActivity.focus}
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
                  <span className="inline-flex items-center gap-1.5">
                    <ListChecks className="size-4" aria-hidden />
                    {nextActivity.questions} questions
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-4" aria-hidden />
                    {nextActivity.estimatedMinutes} min
                  </span>
                </p>
                {nextActivity.status === 'in_progress' && (
                  <div className="mt-4 max-w-md">
                    <ProgressBar value={DEMO_IN_PROGRESS_ANSWERED} max={nextActivity.questions} srLabel="Questions done in this activity" />
                    <p className="mt-1.5 text-xs text-ink-3">
                      {DEMO_IN_PROGRESS_ANSWERED} of {nextActivity.questions} questions done
                    </p>
                  </div>
                )}
                <div className="mt-auto pt-6">
                  <Button size="lg" icon={<Play className="size-4" aria-hidden />} onClick={() => setOpen(nextActivity)}>
                    {nextActivity.status === 'in_progress' ? 'Continue Practice' : 'Start Practice'} <ArrowRight className="size-4" aria-hidden />
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-2">You’re all caught up — great work! New practice will appear here.</p>
            )}
          </CardBody>
        </Card>

        <Card className="md:col-span-2 xl:col-span-5">
          <CardBody className="flex h-full flex-col sm:p-7">
            <span className="flex items-center gap-2 text-sm font-medium text-ink-3">
              <BookOpenCheck className="size-4" aria-hidden />
              Current focus
            </span>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-ink">{student.currentFocus}</h2>
            {focusScore && <p className="text-sm text-ink-3">{focusScore.subject}</p>}
            {focusScore && (
              <div className="mt-4">
                <ProgressBar value={focusScore.score} tone={toneForScore(focusScore.score)} srLabel={`${student.currentFocus} mastery`} />
                <p className="mt-2 text-sm text-ink-2">
                  You’ve mastered <span className="font-semibold text-ink">{focusScore.score}%</span> of this topic.
                </p>
              </div>
            )}
            {steps.length > 0 && (
              <p className="mt-1 text-xs text-ink-3">
                {done} of {steps.length} learning steps finished
              </p>
            )}
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              <ButtonLink to="/student/learning" size="sm">
                Continue Learning
              </ButtonLink>
              <ButtonLink to="/student/progress" variant="secondary" size="sm">
                See my progress
              </ButtonLink>
            </div>
          </CardBody>
        </Card>

        <section aria-labelledby="snapshot-heading" className="md:col-span-2 xl:col-span-12">
          <SectionHeading id="snapshot-heading" title="My practice so far" description="From the activities you’ve finished this term" />
          <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard size="sm" label="Practice completed" value={completed.length} icon={CheckCircle2} tone="good" hint="activities" />
            <StatCard size="sm" label="Questions answered" value={questionsAnswered} icon={ListChecks} hint="so far" />
            <StatCard size="sm" label="Average score" value={`${student.average}%`} icon={TrendingUp} tone="accent" hint="recent work" />
            <StatCard size="sm" label="Time practising" value={`${minutes} min`} icon={Timer} tone="warn" hint="estimated" />
          </div>
        </section>

        <Card className="md:col-span-2 xl:col-span-8">
          <CardHeader
            title="Keep going"
            description="Your practice, ready when you are"
            icon={<Play aria-hidden />}
            action={
              <Link to="/student/practice" className="text-sm font-medium text-brand-ink hover:underline">
                All practice
              </Link>
            }
          />
          <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
            {[current, ...upNext, ...PRACTICE_ACTIVITIES.filter((a) => a.status === 'not_started').slice(3)]
              .filter((a): a is PracticeActivity => a !== undefined && (pendingFromTeacher !== undefined || a.id !== nextActivity?.id))
              .slice(0, 4)
              .map((a) => (
                <PracticeActivityCard key={a.id} activity={a} onOpen={setOpen} />
              ))}
          </div>
        </Card>

        <Card className="md:col-span-2 xl:col-span-4">
          <CardHeader
            title="What I did"
            icon={<Award aria-hidden />}
            action={
              <StatusBadge tone="warn" icon={Flame}>
                {LEARNING_STREAK_DAYS}-day streak
              </StatusBadge>
            }
          />
          <AchievementList items={RECENT_ACHIEVEMENTS} formatDate={formatShortDate} />
        </Card>

        {lastCompleted && (
          <Card className="md:col-span-2 xl:col-span-7">
            <CardHeader title="How did it go?" description={`Tell your teacher about “${lastCompleted.title}”`} icon={<Sparkles aria-hidden />} />
            <CardBody>
              <FeedbackControl activityTitle={lastCompleted.title} initialDifficulty={lastCompleted.feedback} />
            </CardBody>
          </Card>
        )}

        {latestMessage && (
          <Card tier="tertiary" className="md:col-span-2 xl:col-span-5">
            <CardHeader
              title="Latest message from your teacher"
              icon={<MessageSquareText aria-hidden />}
              action={
                <Link to="/student/feedback" className="text-sm font-medium text-brand-ink hover:underline">
                  All feedback
                </Link>
              }
            />
            <CardBody>
              <p className="text-sm font-semibold text-ink">{latestMessage.title}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">“{latestMessage.message}”</p>
              <p className="mt-3 text-xs text-ink-3">
                {latestMessage.from} · {formatShortDate(latestMessage.date)}
              </p>
            </CardBody>
          </Card>
        )}
      </div>

      <SamplePracticeModal activity={open} onClose={() => setOpen(null)} />
    </>
  )
}
