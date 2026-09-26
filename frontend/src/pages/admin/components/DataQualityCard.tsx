import { CheckCircle2, CircleAlert } from 'lucide-react'
import { Card, CardHeader } from '../../../components/ui/Card'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import { DATA_QUALITY } from '../../../data/performance'
import { cn } from '../../../lib/cn'

/** Completeness indicators that affect the reliability of diagnostics. */
export function DataQualityCard() {
  return (
    <Card>
      <CardHeader title="Data quality" description="Completeness of records used for diagnostics" />
      <ul className="space-y-4 p-5">
        {DATA_QUALITY.map((d) => {
          const complete = d.value >= d.total
          const Icon = complete ? CheckCircle2 : CircleAlert
          return (
            <li key={d.label}>
              <div className="mb-1.5 flex items-start justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-start gap-2 text-ink-2">
                  <Icon className={cn('mt-0.5 size-4 shrink-0', complete ? 'text-good' : 'text-warn')} aria-hidden />
                  <span>
                    {d.label}
                    <span className="sr-only">{complete ? ' (complete)' : ' (incomplete)'}</span>
                  </span>
                </span>
                <span className="tabular shrink-0 font-medium text-ink">
                  {d.value} / {d.total}
                </span>
              </div>
              <ProgressBar value={d.value} max={d.total} tone={d.tone} size="sm" srLabel={d.label} />
            </li>
          )
        })}
      </ul>
      <p className="px-5 pb-4 text-xs text-ink-3">Demo data for UI preview</p>
    </Card>
  )
}
