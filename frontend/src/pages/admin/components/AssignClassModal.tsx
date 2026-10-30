import { School } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { SelectField } from '../../../components/ui/Field'
import { Modal } from '../../../components/ui/Modal'
import { useLiveData } from '../../../context/LiveDataContext'
import { useToast } from '../../../context/ToastContext'
import { getClass } from '../../../data/classes'
import { api, ApiError } from '../../../lib/api'
import { classChoices } from '../../../lib/classLevels'
import type { Teacher } from '../../../types'

/**
 * Adds a class to a teacher's classes through the staff feed, keeping the ones they have. A standard class
 * not made yet (e.g. "Primary 3") is created, with this teacher as its class teacher. Null keeps it closed.
 */
export function AssignClassModal({ teacher, onClose }: { teacher: Teacher | null; onClose: () => void }) {
  const { notify } = useToast()
  const { refresh } = useLiveData()
  const [className, setClassName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const current = teacher ? teacher.classIds.map((id) => getClass(id)?.name).filter((n): n is string => !!n) : []
  const options = classChoices().filter((n) => !current.some((c) => c.toLowerCase() === n.toLowerCase()))

  const close = () => {
    setClassName('')
    setError('')
    onClose()
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!teacher || !className) return
    setBusy(true)
    setError('')
    try {
      await api('/feed/staff/commit', { body: { rows: [{ name: teacher.name, email: teacher.email, role: 'teacher', classes: [...current, className].join('; ') }] } })
      await refresh()
      notify(`${teacher.name} now teaches ${className}`, { description: 'They can add its students and parents from their Learners menu.' })
      close()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={teacher !== null}
      onClose={close}
      title="Assign class"
      description={teacher ? `Choose a class for ${teacher.name}.${current.length ? ` They already teach ${current.join(', ')}.` : ''}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="assign-class-form" disabled={busy || !className} icon={<School className="size-4" aria-hidden />}>
            {busy ? 'Assigning…' : 'Assign class'}
          </Button>
        </>
      }
    >
      <form id="assign-class-form" onSubmit={save} className="space-y-3">
        <SelectField
          label="Class"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          options={[{ value: '', label: 'Choose a class' }, ...options.map((n) => ({ value: n, label: n }))]}
          required
        />
        {error && <p className="text-sm text-bad-ink" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}
