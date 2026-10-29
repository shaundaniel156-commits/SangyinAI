import { KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { PasswordField } from '../../../components/ui/Field'
import { Modal } from '../../../components/ui/Modal'
import type { UserAccount } from '../../../data/adminUsers'
import { useToast } from '../../../context/ToastContext'
import { api, ApiError } from '../../../lib/api'

/** Lets the administrator give an account a new password. Open it by passing the account; null keeps it closed. */
export function SetPasswordModal({ user, onClose }: { user: UserAccount | null; onClose: () => void }) {
  const { notify } = useToast()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const close = () => {
    setPassword('')
    setError('')
    onClose()
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    setError('')
    try {
      await api(`/feed/users/${encodeURIComponent(user.id)}/password`, { method: 'PATCH', body: { password } })
      notify(`New password set for ${user.name}`, { description: 'Pass it on to them; they should change it in Settings after signing in.' })
      close()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={user !== null}
      onClose={close}
      title="Set password"
      description={user ? `${user.name} (${user.email}) signs in with this password from now on.` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="set-password-form" disabled={busy} icon={<KeyRound className="size-4" aria-hidden />}>
            {busy ? 'Saving…' : 'Set password'}
          </Button>
        </>
      }
    >
      <form id="set-password-form" onSubmit={save} className="space-y-3">
        <PasswordField
          label="New password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          hint="At least 8 characters. Use the eye to check what you typed before passing it on."
        />
        {error && <p className="text-sm text-bad-ink" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}
