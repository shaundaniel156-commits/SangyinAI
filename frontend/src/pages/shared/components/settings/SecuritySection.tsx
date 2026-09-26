import { Laptop, Smartphone } from 'lucide-react'
import { DemoNotice } from '../../../../components/ui/DemoNotice'
import { TextField } from '../../../../components/ui/Field'
import { Card, CardHeader } from '../../../../components/ui/Card'
import { StatusBadge } from '../../../../components/ui/StatusBadge'
import { SettingsSection } from './SettingsSection'

/** Placeholder sessions list — no real session tracking exists in the prototype. */
const DEMO_SESSIONS = [
  { id: 'current', device: 'This browser', detail: 'Active now', icon: Laptop, current: true },
  { id: 'phone', device: 'Mobile device (example)', detail: 'Last seen: yesterday', icon: Smartphone, current: false },
]

export function SecuritySection() {
  return (
    <div className="space-y-6">
      <SettingsSection title="Change password" description="Use at least 8 characters." saveLabel="Update password">
        <div className="grid max-w-md grid-cols-1 gap-4">
          <TextField label="Current password" type="password" autoComplete="current-password" />
          <TextField label="New password" type="password" autoComplete="new-password" minLength={8} />
          <TextField label="Confirm new password" type="password" autoComplete="new-password" minLength={8} />
        </div>
        <DemoNotice className="mt-4">There is no real sign-in in this prototype, so passwords are not checked or stored.</DemoNotice>
      </SettingsSection>

      <Card>
        <CardHeader title="Signed-in devices" description="Placeholder — session management is not available in this prototype." />
        <ul className="divide-y divide-line">
          {DEMO_SESSIONS.map((s) => {
            const Icon = s.icon
            return (
              <li key={s.id} className="flex items-center gap-3 px-5 py-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-3 text-ink-2">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{s.device}</p>
                  <p className="text-sm text-ink-3">{s.detail}</p>
                </div>
                {s.current && <StatusBadge tone="good">Current</StatusBadge>}
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
