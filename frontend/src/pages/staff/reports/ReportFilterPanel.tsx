import { SelectField, TextField } from '../../../components/ui/Field'
import { DEMO_SCHOOL } from '../../../data/school'
import type { SchoolClass, Student, Subject } from '../../../types'
import type { ReportFilters, ReportType } from './types'

const SUBJECTS: Subject[] = ['Mathematics', 'English', 'Science', 'Social Studies']

interface ReportFilterPanelProps {
  type: ReportType
  filters: ReportFilters
  onChange: (patch: Partial<ReportFilters>) => void
  classes: SchoolClass[]
  /** Students in the selected class. */
  students: Student[]
}

/** Period, class, student and subject filters; only fields relevant to the report type are shown. */
export function ReportFilterPanel({ type, filters, onChange, classes, students }: ReportFilterPanelProps) {
  const needsClass = type === 'student' || type === 'class'
  const classOptions = needsClass
    ? classes.map((c) => ({ value: c.id, label: c.name }))
    : [{ value: 'all', label: 'All classes in scope' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]

  return (
    <div className="space-y-4">
      <SelectField
        label="Term"
        value={filters.term}
        onChange={(e) => onChange({ term: e.target.value })}
        options={DEMO_SCHOOL.termOptions.map((t) => ({ value: t, label: t }))}
      />
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-ink">Assessment date range</legend>
        <div className="grid grid-cols-2 gap-2">
          <TextField label="From" hideLabel type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => onChange({ from: e.target.value })} />
          <TextField label="To" hideLabel type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => onChange({ to: e.target.value })} />
        </div>
        <p className="mt-1.5 text-xs text-ink-3">Optional. Limits the assessments listed in the report.</p>
      </fieldset>
      {type !== 'subject' && (
        <SelectField
          label="Class"
          value={filters.classId}
          onChange={(e) => onChange({ classId: e.target.value })}
          options={classOptions}
        />
      )}
      {type === 'student' && (
        <SelectField
          label="Student"
          value={filters.studentId}
          onChange={(e) => onChange({ studentId: e.target.value })}
          options={students.map((s) => ({ value: s.id, label: s.name }))}
        />
      )}
      {(type === 'class' || type === 'competency' || type === 'student') && (
        <SelectField
          label="Subject"
          value={filters.subject}
          onChange={(e) => onChange({ subject: e.target.value as ReportFilters['subject'] })}
          options={[{ value: 'all', label: 'All subjects' }, ...SUBJECTS.map((s) => ({ value: s, label: s }))]}
        />
      )}
    </div>
  )
}
