import { AlertTriangle, BookOpenCheck, Clock, Flag } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { TeachingPlan } from '../../../types'

/** How to teach the targeted gaps: per topic, the method, the steps with minutes, the time to spend and when to stop. */
export function TeachingPlanCard({ plan }: { plan: TeachingPlan }) {
  return (
    <Card>
      <CardHeader
        title="Teaching plan"
        description="How to close each gap before or alongside this practice — and when to stop, so no time is spent over-teaching."
        icon={<BookOpenCheck className="size-5" aria-hidden />}
      />
      <CardBody className="space-y-6">
        <p className="text-sm text-ink-2">{plan.overview}</p>
        {plan.topics.map((t, i) => {
          const minutes = t.steps.reduce((n, s) => n + s.minutes, 0)
          return (
            <section key={t.competency} aria-labelledby={`plan-topic-${i}`} className="rounded-xl border border-line bg-surface-2 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 id={`plan-topic-${i}`} className="text-[15px] font-semibold text-ink">
                  {i + 1}. {t.competency}
                </h3>
                <StatusBadge icon={Clock} tone="info">{t.recommendedTime}</StatusBadge>
              </div>
              <p className="mt-1.5 text-sm text-ink-2">{t.approach}</p>

              <ol className="mt-4 space-y-2">
                {t.steps.map((s, j) => (
                  <li key={j} className="flex gap-3 rounded-lg bg-surface px-3 py-2.5">
                    <span className="tabular mt-0.5 size-6 shrink-0 rounded-full bg-brand-soft text-center text-xs font-semibold leading-6 text-brand-ink" aria-hidden>
                      {j + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-medium text-ink">{s.title}</span>
                        <span className="tabular shrink-0 text-xs text-ink-3">{s.minutes} min</span>
                      </span>
                      <span className="mt-0.5 block text-sm text-ink-2">{s.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-right text-xs text-ink-3">About {minutes} minutes of lesson time in all</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="flex gap-2 rounded-lg border border-good/30 bg-good-soft px-3 py-2.5 text-sm">
                  <Flag className="mt-0.5 size-4 shrink-0 text-good" aria-hidden />
                  <span>
                    <span className="font-medium text-ink">Stop when</span>
                    <span className="block text-ink-2">{t.stopWhen}</span>
                  </span>
                </div>
                {t.commonMistakes.length > 0 && (
                  <div className="flex gap-2 rounded-lg border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
                    <span>
                      <span className="font-medium text-ink">Watch for</span>
                      <ul className="list-disc pl-4 text-ink-2">
                        {t.commonMistakes.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </span>
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </CardBody>
    </Card>
  )
}
