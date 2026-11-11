import { MessageSquareText, Smile } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAiAssessments } from '../../context/AiAssessmentsContext'
import { CONFIDENCE_OPTIONS, DIFFICULTY_OPTIONS, PRACTICE_ACTIVITIES, teacherMessages, teacherPracticeDone } from '../../data/practice'
import { ROLE_USERS } from '../../data/users'
import { formatShortDate, initialsFrom } from '../../lib/format'
import { FeedbackControl } from './components/FeedbackControl'

export function StudentFeedbackPage() {
  const { items, attempts } = useAiAssessments()
  const messages = teacherMessages(items, ROLE_USERS.student.id)
  // Everything finished (regular practice, plus the teacher's assessments this student has answered), newest first.
  // The student tells the teacher about the practice being done now, or else the one finished most recently.
  const completed = [...PRACTICE_ACTIVITIES.filter((a) => a.status === 'completed'), ...teacherPracticeDone(items, attempts, ROLE_USERS.student.id)].sort((a, b) => (b.completedOn ?? '').localeCompare(a.completedOn ?? ''))
  const current = PRACTICE_ACTIVITIES.find((a) => a.status === 'in_progress') ?? completed[0]
  const answered = completed.filter((a) => a.feedback || a.confidence)

  return (
    <>
      <PageHeader title="Feedback" description="Messages from your teacher, and how you told us your practice went." />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="From your teacher" icon={<MessageSquareText className="size-5" aria-hidden />} />
          {messages.length === 0 ? (
            <EmptyState icon={MessageSquareText} title="No messages yet" description="When your teacher sends feedback, it will appear here." />
          ) : (
            <ul className="divide-y divide-line">
              {messages.map((f) => (
                <li key={f.id} className="flex gap-3 px-5 py-4">
                  <Avatar initials={initialsFrom(f.from)} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{f.title}</p>
                    <p className="mt-1 text-sm text-ink-2">{f.message}</p>
                    <p className="mt-1.5 text-xs text-ink-3">
                      {f.from} · {formatShortDate(f.date)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4 sm:space-y-6">
          {current && (
            <Card>
              <CardHeader title="Tell your teacher" description={current.title} />
              <CardBody>
                <FeedbackControl key={current.id} activity={current} />
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Your answers" icon={<Smile className="size-5" aria-hidden />} />
            {answered.length === 0 ? (
              <CardBody>
                <p className="text-sm text-ink-3">You haven’t shared how an activity went yet.</p>
              </CardBody>
            ) : (
              <ul className="divide-y divide-line">
                {answered.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{a.title}</span>
                      <span className="block text-xs text-ink-3">{CONFIDENCE_OPTIONS.find((o) => o.id === a.confidence)?.label ?? 'How difficult was it?'}</span>
                    </span>
                    {a.feedback && <StatusBadge tone="info">{DIFFICULTY_OPTIONS.find((o) => o.id === a.feedback)?.label}</StatusBadge>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
