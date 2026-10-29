import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import type { UserAccount } from '../../../data/adminUsers'
import { ROLE_LABEL } from '../../../data/users'
import { useLiveData } from '../../../context/LiveDataContext'
import { useToast } from '../../../context/ToastContext'
import { api, ApiError } from '../../../lib/api'

/** What deleting each kind of account keeps, so the administrator knows before confirming. */
const KEPT: Record<UserAccount['role'], string> = {
  teacher: 'Assessments and AI drafts they created are kept and listed under you. They are removed from their classes.',
  admin: 'Assessments and AI drafts they created are kept and listed under you.',
  parent: 'Their children’s records are kept; only the parent’s sign-in and links to the children are removed.',
  student: 'The student’s record and results are kept; only their sign-in is removed.',
}

/** Confirms and deletes one account. Open it by passing the account; null keeps it closed. */
export function DeleteUserModal({ user, onClose }: { user: UserAccount | null; onClose: () => void }) {
  const { notify } = useToast()
  const { refresh } = useLiveData()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const close = () => {
    setError('')
    onClose()
  }

  const remove = async () => {
    if (!user) return
    setBusy(true)
    setError('')
    try {
      await api(`/feed/users/${encodeURIComponent(user.id)}`, { method: 'DELETE' })
      await refresh()
      notify(`${user.name} was deleted`)
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
      title="Delete user?"
      description="This cannot be undone."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button variant="danger" onClick={remove} disabled={busy} icon={<Trash2 className="size-4" aria-hidden />}>
            {busy ? 'Deleting…' : 'Delete user'}
          </Button>
        </>
      }
    >
      {user && (
        <div className="space-y-3 text-sm text-ink-2">
          <p>
            <strong className="text-ink">{user.name}</strong> ({ROLE_LABEL[user.role]}, {user.email}) will no longer be able to sign in.
          </p>
          <p>{KEPT[user.role]}</p>
          {error && <p className="text-bad-ink" role="alert">{error}</p>}
        </div>
      )}
    </Modal>
  )
}
