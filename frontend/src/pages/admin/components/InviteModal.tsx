import { Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { SelectField, TextField } from '../../../components/ui/Field'
import { Modal } from '../../../components/ui/Modal'
import { DemoNotice } from '../../../components/ui/DemoNotice'
import { useToast } from '../../../context/ToastContext'
import { CLASSES } from '../../../data/classes'
import { ROLE_LABEL } from '../../../data/users'
import type { Role } from '../../../types'

interface InviteModalProps {
  open: boolean
  onClose: () => void
  /** Lock the role (e.g. "Invite teacher"); otherwise a role select is shown. */
  fixedRole?: Role
}

const ROLES: Role[] = ['teacher', 'admin', 'parent', 'student']

/** Invitation form. Prototype only: submitting shows a toast; nothing is sent. */
export function InviteModal({ open, onClose, fixedRole }: InviteModalProps) {
  const { notify } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>(fixedRole ?? 'teacher')
  const [classId, setClassId] = useState('')
  const formId = fixedRole ? 'invite-teacher-form' : 'invite-user-form'
  const activeRole = fixedRole ?? role

  const submit = (e: FormEvent) => {
    e.preventDefault()
    notify(`Invitation prepared for ${name || 'new user'}`, {
      description: 'Preview only — no invitation email is sent in this prototype.',
    })
    setName('')
    setEmail('')
    setClassId('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={fixedRole === 'teacher' ? 'Invite teacher' : 'Invite user'}
      description="The person will receive a link to set up their account."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} icon={<Send className="size-4" aria-hidden />}>
            Send invitation
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-4">
        <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Demo Teacher 6" required />
        <TextField
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@demo-school.example"
          required
        />
        {!fixedRole && (
          <SelectField
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
          />
        )}
        {(activeRole === 'teacher' || activeRole === 'student') && (
          <SelectField
            label={activeRole === 'teacher' ? 'Assign to class (optional)' : 'Class'}
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            options={[{ value: '', label: 'Select later' }, ...CLASSES.map((c) => ({ value: c.id, label: c.name }))]}
          />
        )}
        <DemoNotice>Form preview only. Invitations are not sent and no account is created.</DemoNotice>
      </form>
    </Modal>
  )
}
