import { CalendarClock, CheckCircle2, ListChecks, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Button, ButtonLink } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useAiAssessments } from '../../../context/AiAssessmentsContext'
import { DEMO_USERS } from '../../../data/users'
import { formatShortDate } from '../../../lib/format'
import type { AiAssessment } from '../../../types'
import { TakeAssessmentModal } from './TakeAssessmentModal'

/** Teacher-approved assessments sent to the signed-in demo student. */
function useMyTeacherAssessments() {
  const { items, attempts } = useAiAssessments()
  const mine = items.filter((a) => a.status === 'sent' && a.studentIds.includes(DEMO_USERS.student.id))
  return { mine, attempts }
}

/** "From your teacher" group on the Practice page. Renders nothing until something is sent. */
export function FromTeacherSection() {
  const { mine, attempts } = useMyTeacherAssessments()
  const [open, setOpen] = useState<AiAssessment | null>(null)
  if (mine.length === 0) return null

  return (
    <section aria-labelledby="practice-teacher">
      <h2 id="practice-teacher" className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
        From your teacher
        <span className="tabular rounded-full bg-brand-soft px-2 text-xs font-medium text-brand-ink">{mine.length}</span>
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {mine.map((a) => {
          const attempt = attempts[a.id]
          return (
            <article key={a.id} className="card-glow flex flex-col rounded-xl border border-brand-500/40 bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{a.title}</p>
                {attempt ? (
                  <StatusBadge tone="good" icon={CheckCircle2}>
                    {attempt.score}/{attempt.total}
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="info" icon={Sparkles}>
                    New
                  </StatusBadge>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-ink-3">{a.messageToStudents}</p>
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
                <span className="inline-flex items-center gap-1">
                  <ListChecks className="size-3.5" aria-hidden />
                  {a.questions.length} questions
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="size-3.5" aria-hidden />
                  Due {formatShortDate(a.dueDate)}
                </span>
              </p>
              <div className="mt-4">
                <Button size="sm" variant={attempt ? 'secondary' : 'primary'} onClick={() => setOpen(a)}>
                  {attempt ? 'Try again' : 'Start'}
                </Button>
              </div>
            </article>
          )
        })}
      </div>
      <TakeAssessmentModal key={open?.id} assessment={open} onClose={() => setOpen(null)} />
    </section>
  )
}

/** Dashboard nudge when the teacher has sent something the student hasn't started. */
export function TeacherAssessmentBanner() {
  const { mine, attempts } = useMyTeacherAssessments()
  const pending = mine.filter((a) => !attempts[a.id])
  if (pending.length === 0) return null
  const first = pending[0]!

  return (
    <div className="card-glow mb-6 flex flex-col gap-4 rounded-2xl border border-brand-500/40 bg-brand-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-brand-ink">
            New from your teacher{pending.length > 1 ? ` (${pending.length})` : ''}: {first.title}
          </p>
          <p className="text-sm text-ink-2">
            {first.questions.length} questions · due {formatShortDate(first.dueDate)}
          </p>
        </div>
      </div>
      <ButtonLink to="/student/practice" size="sm">
        Open practice
      </ButtonLink>
    </div>
  )
}
