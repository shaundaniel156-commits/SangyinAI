import { CheckCircle2, Circle, CircleDot, HeartHandshake, ListChecks, Target } from 'lucide-react'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge, type Tone } from '../../components/ui/StatusBadge'
import { PRACTICE_ACTIVITIES } from '../../data/practice'
import type { PracticeStatus } from '../../types'
import { ChildSwitcher } from './components/ChildSwitcher'
import { getChildSummary } from './components/childSummary'
import { TopicList } from './components/TopicList'
import { useSelectedChild } from './components/useSelectedChild'

const STATUS_WORDS: Record<PracticeStatus, { label: string; tone: Tone; icon: typeof Circle }> = {
  completed: { label: 'Finished', tone: 'good', icon: CheckCircle2 },
  in_progress: { label: 'Working on it', tone: 'info', icon: CircleDot },
  not_started: { label: 'Coming up', tone: 'neutral', icon: Circle },
}

export function ParentFocusPage() {
  const { children, child, setChildId } = useSelectedChild()
  const summary = getChildSummary(child)
  const activities = PRACTICE_ACTIVITIES.filter((a) => a.focus === summary.focus)
  const otherAreas = summary.needsPractice.filter((c) => c.name !== summary.focus)

  return (
    <>
      <PageHeader
        title="Current Learning Focus"
        description={`What ${child.name} is working on at the moment.`}
        actions={<ChildSwitcher childList={children} value={child.id} onChange={setChildId} />}
      />

      <Card>
        <CardBody>
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
              <Target className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-ink-3">Current Learning Focus</p>
              <p className="text-xl font-semibold text-ink">{summary.focus}</p>
              <p className="mt-2 text-sm text-ink-2">
                Recent classwork shows that a little more practice with {summary.focus.toLowerCase()} will help. Your child’s teacher is
                guiding this work in class, and short practice activities are set along the way.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="What your child is practising" icon={<ListChecks className="size-5" aria-hidden />} />
          {activities.length === 0 ? (
            <EmptyState icon={ListChecks} title="No practice shared yet" description="Practice activities for this focus will appear here once the teacher shares them." />
          ) : (
            <ul className="divide-y divide-line">
              {activities.map((a) => {
                const s = STATUS_WORDS[a.status]
                return (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{a.title}</span>
                      <span className="block text-xs text-ink-3">About {a.estimatedMinutes} minutes</span>
                    </span>
                    <StatusBadge tone={s.tone} icon={s.icon}>
                      {s.label}
                    </StatusBadge>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="How you can help" icon={<HeartHandshake className="size-5" aria-hidden />} />
          <CardBody>
            <ul className="space-y-3">
              {summary.tips.slice(0, 2).map((t) => (
                <li key={t.id} className="rounded-lg bg-surface-2 p-3.5">
                  <p className="text-sm font-medium text-ink">{t.title}</p>
                  <p className="mt-1 text-sm text-ink-2">{t.tip}</p>
                </li>
              ))}
            </ul>
            <ButtonLink to="/parent/home-support" variant="secondary" size="sm" className="mt-4">
              See all home support ideas
            </ButtonLink>
          </CardBody>
        </Card>
      </div>

      {otherAreas.length > 0 && (
        <Card className="mt-4 sm:mt-8">
          <CardHeader title="Other areas to keep practising" />
          <CardBody>
            <TopicList topics={otherAreas} empty="" />
          </CardBody>
        </Card>
      )}
    </>
  )
}
