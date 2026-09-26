import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { DemoNotice } from '../../../../components/ui/DemoNotice'
import { Toggle } from '../../../../components/ui/Field'
import { StatusBadge } from '../../../../components/ui/StatusBadge'
import { useSession } from '../../../../context/SessionContext'
import { SettingsSection } from './SettingsSection'

const LAW = 'Uganda Data Protection and Privacy Act, 2019'

/** Consent, data residency and research sharing — per the project's data-privacy requirements. */
export function PrivacySection() {
  const { role } = useSession()
  const [consent, setConsent] = useState(true)
  const [research, setResearch] = useState(false)
  const [localOnly, setLocalOnly] = useState(true)

  return (
    <SettingsSection
      title="Privacy & data"
      description={role === 'student' ? 'How your school keeps your information safe.' : `How student data is handled, in line with the ${LAW}.`}
      saveLabel={role === 'student' || role === 'teacher' ? false : 'Save privacy settings'}
    >
      <div className="flex items-start gap-3 rounded-lg bg-surface-2 p-4">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-good" aria-hidden />
        <p className="text-sm text-ink-2">
          {role === 'student'
            ? 'Only your teachers, your parent or guardian and you can see your results. Your information is stored safely and never sold.'
            : `Student performance data is used only to support learning. Access is limited by role, data on school devices is encrypted, and handling follows the ${LAW}.`}
        </p>
      </div>

      {role === 'parent' && (
        <div className="mt-4 divide-y divide-line">
          <Toggle
            label="I consent to my child’s school results being used to personalise their learning"
            description="You can withdraw consent at any time. Your child’s teacher will be told, and personalised guidance will stop."
            checked={consent}
            onChange={setConsent}
          />
          <div className="pb-3">
            {consent ? (
              <StatusBadge tone="good" icon={CheckCircle2}>
                Consent given · 12 Sept 2026
              </StatusBadge>
            ) : (
              <StatusBadge tone="warn">Consent withdrawn</StatusBadge>
            )}
          </div>
        </div>
      )}

      {role === 'teacher' && (
        <p className="mt-4 text-sm text-ink-2">
          Guidance is only prepared for students whose parent or guardian has given consent. Consent is recorded by the school administrator.
        </p>
      )}

      {role === 'admin' && (
        <div className="mt-4 divide-y divide-line">
          <Toggle
            label="Keep school data on the local school server"
            description="Local data residency: records stay on the school’s own device and only sync to the central service when you allow it."
            checked={localOnly}
            onChange={setLocalOnly}
          />
          <Toggle
            label="Share anonymised trend data for research"
            description="Aggregated results with no names or personal details, used by Sangyin AI and CIT to improve recommendations."
            checked={research}
            onChange={setResearch}
          />
        </div>
      )}

      {role !== 'student' && <DemoNotice className="mt-4">Consent and data settings are shown for layout only and are not stored in this prototype.</DemoNotice>}
    </SettingsSection>
  )
}
