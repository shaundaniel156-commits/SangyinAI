import { Laptop } from 'lucide-react'
import { useState } from 'react'
import { useLiveData } from '../../../../context/LiveDataContext'
import { useToast } from '../../../../context/ToastContext'
import { api } from '../../../../lib/api'
import { DemoNotice } from '../../../../components/ui/DemoNotice'
import { TextField } from '../../../../components/ui/Field'
import { Card, CardHeader } from '../../../../components/ui/Card'
import { StatusBadge } from '../../../../components/ui/StatusBadge'
import { SettingsSection } from './SettingsSection'


export function SecuritySection() {
  const { live } = useLiveData()
  const { notify } = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')

  // Signed in through the backend: changes the password for real (e.g. replacing a one-time password).
  const changePassword = async () => {
    if (!live) return notify('Offline', { tone: 'info', description: 'Sign in while connected to change your password.' })
    if (next.length < 8) return notify('Password too short', { tone: 'info', description: 'Use at least 8 characters.' })
    if (next !== confirm) return notify('Passwords do not match', { tone: 'info', description: 'Type the new password the same way twice.' })
    try {
      await api('/auth/change-password', { body: { currentPassword: current, newPassword: next } })
      setCurrent('')
      setNext('')
      setConfirm('')
      notify('Password updated', { description: 'Use your new password next time you sign in.' })
    } catch (error) {
      notify('Password not changed', { tone: 'info', description: (error as Error).message })
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection title="Change password" description="Use at least 8 characters." saveLabel="Update password" onSave={changePassword}>
        <div className="grid max-w-md grid-cols-1 gap-4">
          <TextField label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          <TextField label="New password" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
          <TextField label="Confirm new password" type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        {!live && <DemoNotice className="mt-4">Offline — sign in while connected to change your password.</DemoNotice>}
      </SettingsSection>

      <Card>
        <CardHeader title="Signed-in devices" description="Other devices aren’t listed yet. Sign-ins expire after 8 hours; change your password to be safe if a device is lost." />
        <ul className="divide-y divide-line">
          <li className="flex items-center gap-3 px-5 py-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-3 text-ink-2">
              <Laptop className="size-[18px]" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">This browser</p>
              <p className="text-sm text-ink-3">Active now</p>
            </div>
            <StatusBadge tone="good">Current</StatusBadge>
          </li>
        </ul>
      </Card>
    </div>
  )
}
