import { Avatar } from '../../../../components/ui/Avatar'
import { TextField } from '../../../../components/ui/Field'
import { useSession } from '../../../../context/SessionContext'
import { ROLE_LABEL } from '../../../../data/users'
import { SettingsSection } from './SettingsSection'

/** Your name and email as the school recorded them. Nobody can change their own yet, so there is nothing to save here. */
export function ProfileSection() {
  const { user, role } = useSession()
  const student = role === 'student'
  const howToChange =
    role === 'student'
      ? 'If something is wrong, ask your teacher.'
      : role === 'parent'
        ? 'If something is wrong, ask the school to correct it.'
        : 'They were set when the account was added. An administrator can correct a teacher’s by adding them again in Manual feed (Staff and classes) with the same email.'
  return (
    <SettingsSection title="Profile" description={student ? 'Your name and account details.' : 'Your name and email, as recorded by your school.'} saveLabel={false}>
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
        <TextField label="Full name" value={user.name} disabled />
        <TextField label="Email address" type="email" value={user.email} disabled />
      </div>
      <p className="mt-3 text-sm text-ink-3">These cannot be changed here yet. {howToChange}</p>
    </SettingsSection>
  )
}
