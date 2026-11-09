import { BookOpenCheck, CheckCircle2, Sparkles, Target } from 'lucide-react'
import { useState } from 'react'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { GUIDANCE_PLANS } from '../../data/guidance'
import { PRACTICE_ACTIVITIES } from '../../data/practice'
import { formatShortDate } from '../../lib/format'
import type { PracticeActivity } from '../../types'
import { LearningSteps } from './components/LearningSteps'
import { PracticeModal } from './components/PracticeModal'
import { getCurrentStudent, getLearningSequence } from './components/studentData'

export function StudentLearningPage() {
  const student = getCurrentStudent()
  const [open, setOpen] = useState<PracticeActivity | null>(null)
  const steps = getLearningSequence(student)
  const later = PRACTICE_ACTIVITIES.filter((a) => a.focus !== student.currentFocus && a.status !== 'completed')
  const finished = PRACTICE_ACTIVITIES.filter((a) => a.focus !== student.currentFocus && a.status === 'completed')
  // Guidance plans the teacher approved for this student (only approved plans ever reach a student).
  const plans = GUIDANCE_PLANS.filter((g) => g.studentId === student.id && g.status === 'approved')

  return (
    <>
      <PageHeader title="My Learning" description="Your learning path, one step at a time." />

      {plans.length > 0 && (
        <section aria-labelledby="plans-from-teacher" className="mb-6">
          <h2 id="plans-from-teacher" className="mb-3 text-base font-semibold text-ink">
            From your teacher
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
            {plans.map((g) => (
              <Card key={g.id}>
                <CardHeader title={`Your plan for ${g.competencyGap}`} description={`${g.subject} · a step-by-step guide from your teacher`} icon={<Sparkles className="size-5" aria-hidden />} />
                <CardBody>
                  {/* Newer plans carry every step in full; older ones only the titles. */}
                  <ol className="space-y-5">
                    {(g.outputs.studentGuide ?? g.outputs.studentSequence.map((title) => ({ title, detail: '', example: undefined, check: undefined }))).map((step, i) => (
                      <li key={`${i}-${step.title}`} className="flex gap-3">
                        <span className="tabular grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand-ink">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="pt-0.5 text-[15px] font-semibold text-ink">{step.title}</p>
                          {step.detail && <p className="mt-1 text-sm leading-relaxed text-ink-2">{step.detail}</p>}
                          {step.example && (
                            <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-sm leading-relaxed text-ink-2">
                              <span className="font-medium text-ink">Example: </span>
                              {step.example}
                            </p>
                          )}
                          {step.check && (
                            <p className="mt-2 rounded-lg bg-good-soft px-3 py-2 text-sm leading-relaxed text-good-ink">
                              <span className="font-medium">Check yourself: </span>
                              {step.check}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                  {g.pacing && <p className="mt-4 rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-3">When: {g.pacing}</p>}
                </CardBody>
              </Card>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={student.currentFocus ? `Current Focus: ${student.currentFocus}` : 'Current Focus'}
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

      <PracticeModal activity={open} onClose={() => setOpen(null)} />
    </>
  )
}
