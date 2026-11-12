import { ShieldCheck } from 'lucide-react'
import { useSession } from '../../../../context/SessionContext'
import { SettingsSection } from './SettingsSection'

const LAW = 'Uganda Data Protection and Privacy Act, 2019'

/** How student data is handled. Consent is not recorded in Sangyin yet, so there are no settings to save here. */
export function PrivacySection() {
  const { role } = useSession()
  return (
    <SettingsSection
      title="Privacy & data"
      description={role === 'student' ? 'How your school keeps your information safe.' : `How student data is handled, in line with the ${LAW}.`}
      saveLabel={false}
    >
      <div className="flex items-start gap-3 rounded-lg bg-surface-2 p-4">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-good" aria-hidden />
        <p className="text-sm text-ink-2">
          {role === 'student'
            ? 'Only your teachers, your parent or guardian and you can see your results. Your information is stored safely and never sold.'
            : `Student performance data is used only to support learning. Access is limited by role, and handling follows the ${LAW}.`}
        </p>
      </div>
      <p className="mt-4 text-sm text-ink-2">
        {role === 'student'
          ? 'If you have a question about your information, ask your teacher.'
          : role === 'parent'
            ? 'Consent for your child’s results to be used in Sangyin is given to the school. Recording or withdrawing it here is not available yet; speak to the school if you want to change it.'
            : 'Consent records, local-only storage and research sharing are not available in Sangyin yet. Consent is kept by the school for now, so there is nothing to set here.'}
      </p>
    </SettingsSection>
  )
}
