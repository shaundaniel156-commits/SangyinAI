import { Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { PasswordField, SelectField, TextField } from '../../../components/ui/Field'
import { Modal } from '../../../components/ui/Modal'
import { useLiveData } from '../../../context/LiveDataContext'
import { useToast } from '../../../context/ToastContext'
import { CLASSES } from '../../../data/classes'
import { ROLE_LABEL } from '../../../data/users'
import { api, ApiError } from '../../../lib/api'
import type { Role } from '../../../types'

interface InviteModalProps {
  open: boolean
  onClose: () => void
  /** Lock the role (e.g. "Invite teacher"); otherwise a role select is shown. */
  fixedRole?: Role
}

const ROLES: Role[] = ['teacher', 'admin', 'parent', 'student']

interface CommitResult {
  created: number
  updated: number
  accounts?: { email: string; tempPassword: string; emailSent?: boolean; deliveryError?: string }[]
}

/**
 * Creates a teacher or administrator account through the staff feed; the server emails the one-time password.
 * Students and parents are added on the Data page (students with their class, parents linked to their children).
 */
export function InviteModal({ open, onClose, fixedRole }: InviteModalProps) {
  const { notify } = useToast()
  const { refresh } = useLiveData()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>(fixedRole ?? 'teacher')
  const [classId, setClassId] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // The new account's one-time password, shown once so the administrator can pass it on (reason: why the email failed).
  const [handover, setHandover] = useState<{ email: string; password: string; emailed: boolean; reason: string } | null>(null)
  const formId = fixedRole ? 'invite-teacher-form' : 'invite-user-form'
  const activeRole = fixedRole ?? role
  const isStaff = activeRole === 'teacher' || activeRole === 'admin'

  const close = () => {
    setName('')
    setEmail('')
    setPhone('')
    setPassword('')
    setClassId('')
    setError('')
    setHandover(null)
    onClose()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isStaff) return
    setBusy(true)
    setError('')
    try {
      const className = CLASSES.find((c) => c.id === classId)?.name ?? ''
      const result = await api<CommitResult>('/feed/staff/commit', {
        body: { rows: [{ name: name.trim(), email: email.trim(), role: activeRole, classes: className, phone: phone.trim(), password: password.trim() }] },
      })
      await refresh()
      const account = result.accounts?.[0]
      if (!account) {
        notify(`${name} already had an account`, { description: 'Their details were updated; their password was not changed.' })
        close()
      } else {
        setHandover({ email: account.email, password: account.tempPassword, emailed: Boolean(account.emailSent), reason: account.deliveryError ?? 'The email could not be sent.' })
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={fixedRole === 'teacher' ? 'Invite teacher' : 'Invite user'}
      description="The person gets an email with their sign-in details and a one-time password."
      footer={
        handover ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            {isStaff && (
              <Button type="submit" form={formId} disabled={busy} icon={<Send className="size-4" aria-hidden />}>
                {busy ? 'Creating…' : 'Send invitation'}
              </Button>
            )}
          </>
        )
      }
    >
      {handover ? (
        <div className="space-y-3 text-sm text-ink-2">
          <p>
            The account for <strong className="text-ink">{handover.email}</strong> was created.{' '}
            {handover.emailed ? 'Their sign-in details were emailed to them.' : <>The email did not go out: {handover.reason} Pass on this password yourself.</>}
          </p>
          <p>
            Their password (shown only now, it can’t be looked up later). They should change it in Settings after signing in.
          </p>
          <p className="rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 font-mono text-base text-ink select-all">{handover.password}</p>
        </div>
      ) : (
        <form id={formId} onSubmit={submit} className="space-y-4">
          {!fixedRole && (
            <SelectField
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
            />
          )}
          {isStaff ? (
            <>
              <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Akello" required />
              <TextField
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@yourschool.ac.ug"
                required
              />
              <PasswordField
                label="Password (optional)"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                placeholder="Leave empty for a random one-time password"
                hint="At least 8 characters. They should change it in Settings after signing in."
              />
              <TextField label="Phone (optional)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+256700000000" />
              {activeRole === 'teacher' && (
                <SelectField
                  label="Assign to class (optional)"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  options={[{ value: '', label: 'Select later' }, ...CLASSES.map((c) => ({ value: c.id, label: c.name }))]}
                />
              )}
              {error && <p className="text-sm text-bad-ink" role="alert">{error}</p>}
            </>
          ) : (
            <p className="text-sm text-ink-2">
              {activeRole === 'student' ? 'Students' : 'Parents'} are added on the{' '}
              <Link to="/data" onClick={close} className="font-medium text-brand-ink underline">
                Data page
              </Link>{' '}
              under <strong>Students</strong>: each student goes into a class, and giving a parent's email there creates the parent's account and links it to their child.
            </p>
          )}
        </form>
      )}
    </Modal>
  )
}
