import { Card, CardHeader } from '../../../components/ui/Card'
import { DEMO_SCHOOL } from '../../../data/school'

/** Read-only summary of the (demo) school's configuration. */
export function SchoolInfoCard({ classCount, studentCount }: { classCount: number; studentCount: number }) {
  const rows: [string, string][] = [
    ['School name', DEMO_SCHOOL.name],
    ['Type', DEMO_SCHOOL.type],
    ['Location', DEMO_SCHOOL.location],
    ['Academic year', `${DEMO_SCHOOL.academicYear} · ${DEMO_SCHOOL.currentTerm}`],
    ['Contact', DEMO_SCHOOL.contactEmail],
    ['Classes / students', `${classCount} / ${studentCount}`],
  ]
  return (
    <Card>
      <CardHeader title="School information" description="Demo school — placeholder details" />
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-3">{label}</dt>
            <dd className="mt-1 truncate text-sm text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
