import { Link } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { ProgressBar, toneForScore } from '../../../components/ui/ProgressBar'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { getClass } from '../../../data/classes'
import { FRAMEWORK_LABEL } from '../../../data/curriculum'
import type { SchoolClass, Teacher } from '../../../types'
import { AccountStatusBadge } from './AccountStatusBadge'

/** Drawer body: a teacher's profile, subjects and assigned classes. */
export function TeacherDetails({ teacher }: { teacher: Teacher }) {
  const classes = teacher.classIds.map(getClass).filter((c): c is SchoolClass => Boolean(c))
  const students = classes.reduce((sum, c) => sum + c.studentCount, 0)
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar initials={teacher.initials} size="lg" />
        <div className="min-w-0 space-y-1.5">
          <AccountStatusBadge status={teacher.status} />
          <p className="text-sm text-ink-3">Last active: {teacher.lastActive}</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-surface-2 p-3">
          <dt className="text-xs text-ink-3">Classes</dt>
          <dd className="tabular mt-0.5 text-lg font-semibold text-ink">{classes.length}</dd>
        </div>
        <div className="rounded-lg bg-surface-2 p-3">
          <dt className="text-xs text-ink-3">Students in these classes</dt>
          <dd className="tabular mt-0.5 text-lg font-semibold text-ink">{students}</dd>
        </div>
      </dl>

      <section>
        <h3 className="text-sm font-semibold text-ink">Subjects</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {teacher.subjects.map((s) => (
            <StatusBadge key={s} tone="info">{s}</StatusBadge>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-ink">Assigned classes</h3>
        {classes.length === 0 ? (
          <p className="mt-2 text-sm text-ink-3">No classes assigned yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
            {classes.map((c) => (
              <li key={c.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/classes/${c.id}`} className="text-sm font-medium text-ink hover:underline">
                      {c.name}
                    </Link>
                    <p className="text-xs text-ink-3">
                      {c.level} · {FRAMEWORK_LABEL[c.framework]}
                    </p>
                  </div>
                  <span className="tabular shrink-0 text-xs text-ink-3">{c.studentCount} students</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <ProgressBar value={c.average} tone={toneForScore(c.average)} size="sm" className="flex-1" srLabel={`${c.name} average`} />
                  <span className="tabular w-9 text-right text-sm font-medium text-ink">{c.average}%</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-ink-3">Demo data for UI preview</p>
    </div>
  )
}
