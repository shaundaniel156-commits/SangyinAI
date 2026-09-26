import { Award, CheckCircle2, Circle, CircleDot, Flag } from 'lucide-react'
import { ChartContainer } from '../../components/charts/ChartContainer'
import { LineChart } from '../../components/charts/LineChart'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { LevelBadge } from '../../components/ui/StatusBadge'
import { getStudentTrend } from '../../data/performance'
import { PRACTICE_ACTIVITIES } from '../../data/practice'
import { formatShortDate } from '../../lib/format'
import type { CompetencyScore, Subject } from '../../types'
import { cn } from '../../lib/cn'
import { getCurrentStudent, getCurriculumMilestones, type MilestoneState } from './components/studentData'

const LEVEL_BAR = { strength: 'good', developing: 'warn', needs_support: 'bad' } as const

const MILESTONE_STATE: Record<MilestoneState, { label: string; icon: typeof Flag; cls: string }> = {
  reached: { label: 'Reached', icon: CheckCircle2, cls: 'text-good' },
  working_on: { label: 'Working on it', icon: CircleDot, cls: 'text-warn' },
  coming_up: { label: 'Coming up', icon: Circle, cls: 'text-ink-3' },
}

export function StudentProgressPage() {
  const student = getCurrentStudent()
  const trend = getStudentTrend(student.average, student.trend)
  const values = trend.map((p) => p.value)
  const min = Math.max(0, Math.floor((Math.min(...values) - 10) / 10) * 10)
  const max = Math.min(100, Math.ceil((Math.max(...values) + 10) / 10) * 10)
  const completed = PRACTICE_ACTIVITIES.filter((a) => a.status === 'completed')
  const milestones = getCurriculumMilestones(student)
  const reached = milestones.filter((m) => m.state === 'reached').length

  const bySubject = student.competencies.reduce<Partial<Record<Subject, CompetencyScore[]>>>((acc, c) => {
    ;(acc[c.subject] ??= []).push(c)
    return acc
  }, {})

  return (
    <>
      <PageHeader title="My Progress" description="See how far you’ve come. Every step counts!" />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <ChartContainer
          className="lg:col-span-2"
          title="My progress over time"
          description="Your average in recent school work"
          table={{ headers: ['Month', 'Average'], rows: trend.map((p) => [p.label, `${p.value}%`]) }}
        >
          <LineChart ariaLabel="Line chart of your average over recent months" min={min} max={max} series={[{ name: 'My average', points: trend, color: 'var(--color-series-1)' }]} />
        </ChartContainer>

        <Card>
          <CardHeader title="Practice completed" icon={<Award className="size-5" aria-hidden />} />
          <ul className="divide-y divide-line">
            {completed.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                <CheckCircle2 className="size-5 shrink-0 text-good" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{a.title}</span>
                  <span className="block text-xs text-ink-3">{a.focus}</span>
                </span>
                {a.completedOn && <span className="shrink-0 text-xs text-ink-3">{formatShortDate(a.completedOn)}</span>}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <h2 className="mt-8 mb-3 text-base font-semibold text-ink">My topics</h2>
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        {Object.entries(bySubject).map(([subject, topics]) => (
          <Card key={subject}>
            <CardHeader title={subject} />
            <CardBody>
              <ul className="space-y-4">
                {topics!.map((t) => (
                  <li key={t.competencyId}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-ink">{t.name}</span>
                      <LevelBadge level={t.level} friendly />
                    </div>
                    <ProgressBar value={t.score} tone={LEVEL_BAR[t.level]} size="sm" srLabel={`${t.name} progress`} />
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>
      {milestones.length > 0 && (
        <Card className="mt-8">
          <CardHeader
            title="My curriculum milestones"
            description={`${reached} of ${milestones.length} milestones reached this year`}
            icon={<Flag className="size-5" aria-hidden />}
          />
          <CardBody>
            <ProgressBar value={reached} max={milestones.length} tone="good" srLabel="Milestones reached" />
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {milestones.map((m) => {
                const s = MILESTONE_STATE[m.state]
                return (
                  <li key={m.code} className="flex items-start gap-3 rounded-lg bg-surface-2 px-3 py-2.5">
                    <s.icon className={cn('mt-0.5 size-5 shrink-0', s.cls)} aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">{m.text}</span>
                      <span className="block text-xs text-ink-3">
                        {m.topic} · {s.label}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </CardBody>
        </Card>
      )}
      <p className="mt-4 text-xs text-ink-3">Demo data for UI preview.</p>
    </>
  )
}
