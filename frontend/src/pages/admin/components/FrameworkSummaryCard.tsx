import { Link } from 'react-router-dom'
import { Card, CardHeader } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { FRAMEWORK_LABEL } from '../../../data/curriculum'
import { DEMO_SCHOOL } from '../../../data/school'
import type { CurriculumFramework, SchoolClass } from '../../../types'

const FRAMEWORKS: CurriculumFramework[] = ['uganda', 'cambridge']

/** Which curriculum framework the school and each class follows. */
export function FrameworkSummaryCard({ classes }: { classes: SchoolClass[] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Curriculum frameworks"
        description="Configured per school and per class"
        action={
          <Link to="/admin/structure" className="text-sm font-medium text-brand-ink hover:underline">
            Configure
          </Link>
        }
      />
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3.5 py-3">
          <span className="text-sm text-ink-2">School primary framework</span>
          <StatusBadge tone="info">{FRAMEWORK_LABEL[DEMO_SCHOOL.primaryFramework]}</StatusBadge>
        </div>
        {FRAMEWORKS.map((f) => {
          const list = classes.filter((c) => c.framework === f)
          return (
            <div key={f}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-medium text-ink">{FRAMEWORK_LABEL[f]}</h3>
                <span className="tabular text-sm text-ink-3">
                  {list.length} {list.length === 1 ? 'class' : 'classes'}
                </span>
              </div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {list.length === 0 && <li className="text-sm text-ink-3">No classes</li>}
                {list.map((c) => (
                  <li key={c.id}>
                    <StatusBadge tone={f === 'cambridge' ? 'accent' : 'neutral'}>{c.name}</StatusBadge>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
