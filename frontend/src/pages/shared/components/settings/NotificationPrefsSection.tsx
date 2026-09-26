import { useState } from 'react'
import { DemoNotice } from '../../../../components/ui/DemoNotice'
import { Toggle } from '../../../../components/ui/Field'
import { StatusBadge } from '../../../../components/ui/StatusBadge'
import { useSession } from '../../../../context/SessionContext'
import type { Role } from '../../../../types'
import { SettingsSection } from './SettingsSection'

interface Pref {
  id: string
  label: string
  description: string
}

/** In-app notification types per role (kinds from the product spec). */
const IN_APP: Record<Role, Pref[]> = {
  teacher: [
    { id: 'results', label: 'New assessment results', description: 'When scores are recorded or imported for your classes.' },
    { id: 'guidance', label: 'AI guidance ready for review', description: 'When a new teaching plan needs your decision.' },
    { id: 'attention', label: 'Student requires attention', description: 'When a learner shows areas requiring support.' },
    { id: 'parents', label: 'Parent communication', description: 'When home-support notes are sent to parents.' },
    { id: 'practice', label: 'Practice activity updates', description: 'When students complete practice activities.' },
  ],
  admin: [
    { id: 'results', label: 'New assessment results', description: 'Summary when assessments are recorded across the school.' },
    { id: 'system', label: 'System and data quality', description: 'Sync status, missing scores and pending invitations.' },
  ],
  parent: [
    { id: 'results', label: 'New results', description: 'When your child has new results to view.' },
    { id: 'focus', label: 'Learning focus and home tips', description: 'When your child starts working on something new.' },
    { id: 'practice', label: 'Practice updates', description: 'When your child finishes a practice activity.' },
  ],
  student: [
    { id: 'practice', label: 'New practice', description: 'When new practice is ready for you.' },
    { id: 'feedback', label: 'Feedback', description: 'When your quiz feedback is ready.' },
  ],
}

const CHANNELS: (Pref & { note?: string })[] = [
  { id: 'app', label: 'Mobile app', description: 'Updates in the Sangyin AI app.' },
  { id: 'sms', label: 'SMS', description: 'Short text messages to your phone.', note: 'Not connected in this prototype' },
  {
    id: 'ussd',
    label: 'USSD',
    description: 'Dial a short code to hear your child’s latest summary — no smartphone or data bundle needed.',
    note: 'Not connected in this prototype',
  },
  { id: 'print', label: 'Printed take-home note', description: 'A paper note sent home with your child.' },
]

export function NotificationPrefsSection() {
  const { role } = useSession()
  const prefs = IN_APP[role]
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(prefs.map((p) => [p.id, true])))
  const [channels, setChannels] = useState<Record<string, boolean>>({ app: true, sms: false, ussd: false, print: true })
  const simple = role === 'parent' || role === 'student'

  return (
    <SettingsSection
      title="Notification preferences"
      description={simple ? 'Choose what you want to hear about.' : 'Choose which in-app notifications you receive.'}
      saveLabel="Save preferences"
    >
      <fieldset>
        <legend className="text-sm font-semibold text-ink">In-app notifications</legend>
        <div className="divide-y divide-line">
          {prefs.map((p) => (
            <Toggle
              key={p.id}
              label={p.label}
              description={p.description}
              checked={enabled[p.id] ?? false}
              onChange={(v) => setEnabled((s) => ({ ...s, [p.id]: v }))}
            />
          ))}
        </div>
      </fieldset>

      {role === 'parent' && (
        <fieldset className="mt-6 border-t border-line pt-5">
          <legend className="text-sm font-semibold text-ink">How updates reach you</legend>
          <p className="mt-0.5 text-sm text-ink-3">Pick one or more ways to get updates about your child.</p>
          <div className="divide-y divide-line">
            {CHANNELS.map((c) => (
              <div key={c.id}>
                <Toggle
                  label={c.label}
                  description={c.description}
                  checked={channels[c.id] ?? false}
                  onChange={(v) => setChannels((s) => ({ ...s, [c.id]: v }))}
                />
                {c.note && (
                  <div className="-mt-1 pb-3">
                    <StatusBadge tone="warn">{c.note}</StatusBadge>
                  </div>
                )}
              </div>
            ))}
          </div>
          <DemoNotice className="mt-3">SMS and USSD delivery are not connected in this prototype. Channel choices are shown for layout only.</DemoNotice>
        </fieldset>
      )}
    </SettingsSection>
  )
}
