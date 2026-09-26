import { SelectField, TextField } from '../../../../components/ui/Field'
import { DEMO_SCHOOL } from '../../../../data/school'
import { SettingsSection } from './SettingsSection'

export function SchoolSection() {
  return (
    <SettingsSection title="School information" description="Basic details of the demo school.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="School name" defaultValue={DEMO_SCHOOL.name} />
        <TextField label="School type" defaultValue={DEMO_SCHOOL.type} />
        <TextField label="Location" defaultValue={DEMO_SCHOOL.location} />
        <TextField label="Contact email" type="email" defaultValue={DEMO_SCHOOL.contactEmail} />
        <TextField label="Academic year" defaultValue={DEMO_SCHOOL.academicYear} inputMode="numeric" />
        <SelectField
          label="Current term"
          defaultValue={`${DEMO_SCHOOL.currentTerm}, ${DEMO_SCHOOL.academicYear}`}
          options={DEMO_SCHOOL.termOptions.map((t) => ({ value: t, label: t }))}
        />
      </div>
    </SettingsSection>
  )
}
