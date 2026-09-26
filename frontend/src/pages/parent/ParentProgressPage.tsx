import { Sparkles, Target } from 'lucide-react'
import { ChartContainer } from '../../components/charts/ChartContainer'
import { LineChart } from '../../components/charts/LineChart'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { LevelBadge } from '../../components/ui/StatusBadge'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { getStudentTrend } from '../../data/performance'
import type { CompetencyScore, Subject } from '../../types'
import { ChildSwitcher } from './components/ChildSwitcher'
import { getChildSummary } from './components/childSummary'
import { TopicList } from './components/TopicList'
import { useSelectedChild } from './components/useSelectedChild'

const LEVEL_BAR = { strength: 'good', developing: 'warn', needs_support: 'bad' } as const

export function ParentProgressPage() {
  const { children, child, setChildId } = useSelectedChild()
  const summary = getChildSummary(child)
  const trend = getStudentTrend(child.average, child.trend)
  const values = trend.map((p) => p.value)
  const min = Math.max(0, Math.floor((Math.min(...values) - 10) / 10) * 10)
  const max = Math.min(100, Math.ceil((Math.max(...values) + 10) / 10) * 10)

  const bySubject = child.competencies.reduce<Partial<Record<Subject, CompetencyScore[]>>>((acc, c) => {
    ;(acc[c.subject] ??= []).push(c)
    return acc
  }, {})

  return (
    <>
      <PageHeader
        title="Progress"
        description={`How ${child.name} is getting on, in plain words.`}
        actions={<ChildSwitcher childList={children} value={child.id} onChange={setChildId} />}
        meta={
          <>
            <LevelBadge level={summary.overallLevel} friendly />
            <span className="text-sm text-ink-2">{summary.progressWords}</span>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <ChartContainer
          className="lg:col-span-2"
          title="Progress over time"
          description="Average of recent school work"
          table={{ headers: ['Month', 'Average'], rows: trend.map((p) => [p.label, `${p.value}%`]) }}
        >
          <LineChart
            ariaLabel={`Line chart of ${child.name}'s average over recent months`}
            min={min}
            max={max}
            series={[{ name: child.name, points: trend, color: 'var(--color-series-1)' }]}
          />
        </ChartContainer>

        <div className="flex flex-col gap-4 sm:gap-6">
          <Card>
            <CardHeader title="Doing well" icon={<Sparkles className="size-5" aria-hidden />} />
            <CardBody>
              <TopicList topics={summary.strengths} empty="Strengths will appear here as your child completes more classwork." />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Needs more practice" icon={<Target className="size-5" aria-hidden />} />
            <CardBody>
              <TopicList topics={summary.needsPractice} empty="No areas need extra practice right now." />
            </CardBody>
          </Card>
        </div>
      </div>

      <h2 className="mt-8 mb-3 text-base font-semibold text-ink">By subject</h2>
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
      <p className="mt-4 text-xs text-ink-3">Demo data for UI preview.</p>
    </>
  )
}
