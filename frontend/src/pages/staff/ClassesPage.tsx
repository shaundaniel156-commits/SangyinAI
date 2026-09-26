import { ChevronRight, GraduationCap, LifeBuoy, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FrameworkBadge } from '../../components/domain/FrameworkBadge'
import { Avatar } from '../../components/ui/Avatar'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { ProgressBar, toneForScore } from '../../components/ui/ProgressBar'
import { useSession } from '../../context/SessionContext'
import { classesInScope } from '../../data/selectors'
import { getStudentsByClass } from '../../data/students'
import { getTeacher } from '../../data/teachers'
import { formatSignedPoints } from '../../lib/format'
import { cn } from '../../lib/cn'

export function ClassesPage() {
  const { role } = useSession()
  const classes = classesInScope(role)
  return (
    <>
      <PageHeader
        title="Classes"
        description={role === 'admin' ? 'All classes at the school and how each is performing.' : 'Your classes and how each one is performing.'}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {classes.map((c) => {
          const teacher = getTeacher(c.teacherId)
          const needing = getStudentsByClass(c.id).filter((s) => s.needsSupport).length
          const topGap = c.commonGaps[0]
          return (
            <Card key={c.id} as="article" className="flex flex-col transition-colors hover:border-brand-300">
              <Link to={`/classes/${c.id}`} className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-ink">{c.name}</h2>
                    <p className="text-sm text-ink-3">{c.level}</p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-ink-3" aria-hidden />
                </div>
                <div className="mt-3">
                  <FrameworkBadge framework={c.framework} />
                </div>
                <div className="mt-5">
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="text-ink-2">Class average</span>
                    <span className="flex items-baseline gap-2">
                      <span className={cn('tabular text-xs', c.trend >= 0 ? 'text-good-ink' : 'text-bad-ink')}>{formatSignedPoints(c.trend)}</span>
                      <span className="tabular font-semibold text-ink">{c.average}%</span>
                    </span>
                  </div>
                  <ProgressBar value={c.average} tone={toneForScore(c.average)} srLabel={`${c.name} average`} />
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-surface-2 p-3">
                    <dt className="flex items-center gap-1.5 text-ink-3">
                      <GraduationCap className="size-4" aria-hidden /> Students
                    </dt>
                    <dd className="tabular mt-1 text-lg font-semibold text-ink">{c.studentCount}</dd>
                  </div>
                  <div className="rounded-lg bg-surface-2 p-3">
                    <dt className="flex items-center gap-1.5 text-ink-3">
                      <LifeBuoy className="size-4" aria-hidden /> Need support
                    </dt>
                    <dd className="tabular mt-1 text-lg font-semibold text-ink">{needing}</dd>
                  </div>
                </dl>
                {topGap && (
                  <p className="mt-4 flex items-start gap-2 text-sm text-ink-2">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-bad" aria-hidden />
                    <span>
                      Most common gap: <span className="font-medium text-ink">{topGap.competency}</span> ({topGap.studentsAffected} students)
                    </span>
                  </p>
                )}
                <div className="mt-auto pt-5">
                  <div className="flex items-center gap-2 border-t border-line pt-4 text-sm text-ink-2">
                    <Avatar initials={teacher?.initials ?? '?'} size="sm" />
                    <span>{teacher?.name}</span>
                    <span className="text-ink-3">· Class teacher</span>
                  </div>
                </div>
              </Link>
            </Card>
          )
        })}
      </div>
    </>
  )
}
