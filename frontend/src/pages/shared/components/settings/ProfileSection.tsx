import { Avatar } from '../../../../components/ui/Avatar'
import { TextField } from '../../../../components/ui/Field'
import { useSession } from '../../../../context/SessionContext'
import { ROLE_LABEL } from '../../../../data/users'
import { SettingsSection } from './SettingsSection'

export function ProfileSection() {
  const { user, role } = useSession()
  const student = role === 'student'
  return (
    <SettingsSection title="Profile" description={student ? 'Your name and account details.' : 'How your name and contact details appear to others.'}>
      <div className="mb-5 flex items-center gap-4">
        <Avatar initials={user.initials} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{user.name}</p>
          <p className="text-sm text-ink-3">
            {ROLE_LABEL[role]} · {user.title}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Full name" defaultValue={user.name} autoComplete="name" disabled={student} hint={student ? 'Ask your teacher to change your name.' : undefined} />
        <TextField label="Email address" type="email" defaultValue={user.email} autoComplete="email" />
        {!student && <TextField label="Title" defaultValue={user.title} />}
        {role === 'parent' && <TextField label="Mobile number" type="tel" placeholder="+256 7XX XXX XXX" autoComplete="tel" hint="Used for SMS updates when available." />}
      </div>
    </SettingsSection>
  )
}
