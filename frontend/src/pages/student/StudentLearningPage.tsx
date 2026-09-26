import { BookOpenCheck, CheckCircle2, Target } from 'lucide-react'
import { useState } from 'react'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PRACTICE_ACTIVITIES } from '../../data/practice'
import { formatShortDate } from '../../lib/format'
import type { PracticeActivity } from '../../types'
import { LearningSteps } from './components/LearningSteps'
import { SamplePracticeModal } from './components/SamplePracticeModal'
import { getCurrentStudent, getLearningSequence } from './components/studentData'

export function StudentLearningPage() {
  const student = getCurrentStudent()
  const [open, setOpen] = useState<PracticeActivity | null>(null)
  const steps = getLearningSequence(student)
  const later = PRACTICE_ACTIVITIES.filter((a) => a.focus !== student.currentFocus && a.status !== 'completed')
  const finished = PRACTICE_ACTIVITIES.filter((a) => a.focus !== student.currentFocus && a.status === 'completed')

  return (
    <>
      <PageHeader title="My Learning" description="Your learning path, one step at a time." />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={`Current Focus: ${student.currentFocus}`}
            description="Work through these steps in order. Your teacher chose them for you."
            icon={<Target className="size-5" aria-hidden />}
          />
          <CardBody>
            {steps.length === 0 ? (
              <EmptyState icon={BookOpenCheck} title="No steps yet" description="Your teacher will add steps for this focus soon." />
            ) : (
              <LearningSteps steps={steps} onOpen={setOpen} />
            )}
          </CardBody>
        </Card>

        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader title="Coming up later" />
            {later.length === 0 ? (
              <CardBody>
                <p className="text-sm text-ink-3">Nothing else planned yet.</p>
              </CardBody>
            ) : (
              <ul className="divide-y divide-line">
                {later.map((a) => (
                  <li key={a.id} className="px-5 py-3">
                    <p className="text-sm font-medium text-ink">{a.title}</p>
                    <p className="text-xs text-ink-3">
                      {a.focus}
                      {a.dueLabel && ` · ${a.dueLabel}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Finished earlier" />
            <ul className="divide-y divide-line">
              {finished.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{a.title}</span>
                    <span className="block text-xs text-ink-3">
                      {a.focus}
                      {a.completedOn && ` · ${formatShortDate(a.completedOn)}`}
                    </span>
                  </span>
                  <StatusBadge tone="good" icon={CheckCircle2}>
                    Completed
                  </StatusBadge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <SamplePracticeModal activity={open} onClose={() => setOpen(null)} />
    </>
  )
}
