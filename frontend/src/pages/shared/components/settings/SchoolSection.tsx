import { useState } from 'react'
import { SelectField, TextField } from '../../../../components/ui/Field'
import { useLiveData } from '../../../../context/LiveDataContext'
import { useToast } from '../../../../context/ToastContext'
import { SCHOOL } from '../../../../data/school'
import { api } from '../../../../lib/api'
import { SettingsSection } from './SettingsSection'

const TYPES = [
  { value: 'primary', label: 'Primary school' },
  { value: 'secondary', label: 'Secondary school' },
  { value: 'mixed', label: 'Primary and secondary' },
  { value: 'university', label: 'University or college' },
]

/** The school's name, type and district, saved to the server: the same details as Manual feed (Staff and classes). Administrators only. */
export function SchoolSection() {
  const { live, refresh } = useLiveData()
  const { notify } = useToast()
  const [name, setName] = useState(SCHOOL.name)
  const [type, setType] = useState(SCHOOL.level)
  const [district, setDistrict] = useState(SCHOOL.location)

  const save = async () => {
    if (!live) return notify('Offline', { tone: 'info', description: 'Sign in while connected to change the school’s details.' })
    if (!name.trim()) return notify('Give the school a name', { tone: 'info' })
    try {
      await api('/feed/institution', { method: 'PATCH', body: { name: name.trim(), type, district: district.trim() } })
      await refresh()
      notify('School details saved', { description: 'They show across the app and on reports.' })
    } catch (error) {
      notify('Not saved', { tone: 'info', description: (error as Error).message })
    }
  }

  return (
    <SettingsSection title="School information" description="The school’s name, type and district, as shown across the app and on reports." saveLabel="Save school details" onSave={save}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="School name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
        <SelectField label="Type of school" value={type} onChange={(e) => setType(e.target.value)} options={TYPES} hint="With the curriculum, decides the class names offered." />
        <TextField label="District" value={district} onChange={(e) => setDistrict(e.target.value)} maxLength={120} placeholder="e.g. Wakiso" />
      </div>
    </SettingsSection>
  )
}
