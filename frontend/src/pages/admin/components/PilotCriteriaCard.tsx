import { CheckCircle2, CircleAlert, Clock } from 'lucide-react'
import { Card, CardHeader } from '../../../components/ui/Card'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { PILOT_CRITERIA } from '../../../data/performance'

/** Pilot-term success criteria and how the school is tracking against each. */
export function PilotCriteriaCard() {
  return (
    <Card>
      <CardHeader title="Pilot success criteria" description="Targets for the pilot term and progress so far" />
      <ul className="divide-y divide-line">
        {PILOT_CRITERIA.map((c) => {
          const met = c.value !== undefined && c.goal !== undefined && c.value >= c.goal
          return (
            <li key={c.metric} className="grid gap-3 px-6 py-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.4fr)] md:items-center">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{c.metric}</p>
                <p className="text-xs text-ink-3">{c.measurement}</p>
              </div>
              <p className="text-sm text-ink-2">{c.target}</p>
              {c.value !== undefined && c.goal !== undefined ? (
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <StatusBadge tone={met ? 'good' : 'warn'} icon={met ? CheckCircle2 : CircleAlert}>
                      {met ? 'On target' : 'Below target'}
                    </StatusBadge>
                    <span className="tabular font-medium text-ink">{c.value}%</span>
                  </div>
                  <ProgressBar value={c.value} max={c.goal <= 20 ? 20 : 100} tone={met ? 'good' : 'warn'} size="sm" srLabel={c.metric} />
                </div>
              ) : (
                <StatusBadge tone="neutral" icon={Clock}>
                  {c.status}
                </StatusBadge>
              )}
            </li>
          )
        })}
      </ul>
      <p className="px-6 pb-4 text-xs text-ink-3">Demo data for UI preview</p>
    </Card>
  )
}
