import { SelectField, TextField } from '../../../../components/ui/Field'
import { SCHOOL, schoolName } from '../../../../data/school'
import { SettingsSection } from './SettingsSection'

export function SchoolSection() {
  return (
    <SettingsSection title="School information" description="Basic details of your school.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="School name" defaultValue={schoolName()} />
        <TextField label="School type" defaultValue={SCHOOL.type} />
        <TextField label="Location" defaultValue={SCHOOL.location} />
        <TextField label="Contact email" type="email" defaultValue={SCHOOL.contactEmail} />
        <TextField label="Academic year" defaultValue={SCHOOL.academicYear} inputMode="numeric" />
        <SelectField
          label="Current term"
          defaultValue={`${SCHOOL.currentTerm}, ${SCHOOL.academicYear}`}
          options={SCHOOL.termOptions.map((t) => ({ value: t, label: t }))}
        />
      </div>
    </SettingsSection>
  )
}
