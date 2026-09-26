import { CalendarDays, CheckCircle2, FileQuestion, HeartHandshake, Lightbulb, Plus, SendHorizontal, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, ButtonLink } from '../../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { TextArea, TextField } from '../../../components/ui/Field'
import { Modal } from '../../../components/ui/Modal'
import { PageHeader } from '../../../components/ui/PageHeader'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useAiAssessments } from '../../../context/AiAssessmentsContext'
import { useToast } from '../../../context/ToastContext'
import { getClass } from '../../../data/classes'
import { getStudent } from '../../../data/students'
import { DEMO_USERS } from '../../../data/users'
import { FrameworkBadge } from '../../../components/domain/FrameworkBadge'
import { CURRICULUM_DISCLAIMER } from '../../../data/curriculum'
import { DIFFICULTY_LABEL, curriculumRefsFor, extraQuestion, replacementQuestion, studentsWithGaps } from '../../../lib/aiAssessment'
import { formatDate } from '../../../lib/format'
import type { AiAssessment } from '../../../types'
import { QuestionItem } from './QuestionItem'
import { WorkflowSteps } from './WorkflowSteps'

export function AiAssessmentReviewPage() {
  const { id } = useParams()
  const { items } = useAiAssessments()
  const assessment = items.find((a) => a.id === id)

  if (!assessment) {
    return (
      <Card>
        <EmptyState
          icon={FileQuestion}
          title="Assessment not found"
          description="It may have been discarded. Drafts are kept in this browser only."
          action={<ButtonLink to="/ai-assessments">Back to AI Assessment Builder</ButtonLink>}
        />
      </Card>
    )
  }
  return <Review assessment={assessment} />
}

function Review({ assessment: a }: { assessment: AiAssessment }) {
  const { update, remove, send, attempts } = useAiAssessments()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [confirmSend, setConfirmSend] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const draft = a.status === 'draft'
  const cls = getClass(a.classId)
  const used = new Set(a.questions.map((q) => q.sourceId))
  const candidates = studentsWithGaps(a.classId, a.competencies, true)
  const chosen = new Set(a.studentIds)
  const canAdd = extraQuestion(a.competencies, used) !== null
  const ready = a.questions.length > 0 && a.studentIds.length > 0 && a.title.trim().length > 0

  const setQuestions = (questions: AiAssessment['questions']) => update(a.id, { questions })

  return (
    <>
      <PageHeader
        back={{ to: '/ai-assessments', label: 'AI Assessment Builder' }}
        title={a.title}
        description={`${cls?.name ?? 'Class'} · ${a.subject} · ${a.questions.length} questions · ${DIFFICULTY_LABEL[a.difficulty]} difficulty`}
        meta={
          draft ? (
            <StatusBadge tone="warn">Draft — awaiting your review</StatusBadge>
          ) : (
            <StatusBadge tone="good" icon={CheckCircle2}>
              Approved & sent {a.sentOn && formatDate(a.sentOn)}
            </StatusBadge>
          )
        }
      />
      <WorkflowSteps current={draft ? 2 : 4} className="mb-8" />

      {!draft && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-2xl border border-good/40 bg-good-soft px-5 py-4 text-sm text-good-ink">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            Sent to {a.studentIds.length} students{a.shareWithParents && ' and their parents'}. Students will find it under{' '}
            <span className="font-semibold">Practice → From your teacher</span>, due {formatDate(a.dueDate)}.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title={`Questions (${a.questions.length})`}
              description={draft ? 'Check each question and answer key. Hover a question to edit, regenerate or remove it.' : 'The version your students received.'}
              action={
                draft && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!canAdd}
                    icon={<Plus className="size-4" aria-hidden />}
                    onClick={() => {
                      const q = extraQuestion(a.competencies, used)
                      if (q) setQuestions([...a.questions, q])
                    }}
                  >
                    Add question
                  </Button>
                )
              }
            />
            {a.questions.length === 0 ? (
              <EmptyState icon={FileQuestion} title="No questions left" description="Add a question to continue." />
            ) : (
              <ol className="divide-y divide-line">
                {a.questions.map((q, i) => (
                  <QuestionItem
                    key={q.id}
                    index={i}
                    question={q}
                    editable={draft}
                    canRegenerate={replacementQuestion(q, used) !== null}
                    onChange={(next) => setQuestions(a.questions.map((x) => (x.id === q.id ? next : x)))}
                    onRegenerate={() => {
                      const next = replacementQuestion(q, used)
                      if (next) setQuestions(a.questions.map((x) => (x.id === q.id ? next : x)))
                    }}
                    onRemove={() => setQuestions(a.questions.filter((x) => x.id !== q.id))}
                  />
                ))}
              </ol>
            )}
          </Card>

          {draft && (
            <div className="flex flex-col-reverse gap-3 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="danger" icon={<Trash2 className="size-4" aria-hidden />} onClick={() => setConfirmDiscard(true)}>
                Discard draft
              </Button>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <span className="text-xs text-ink-3 sm:mr-2">Changes save automatically</span>
                <Button size="lg" disabled={!ready} icon={<SendHorizontal className="size-4" aria-hidden />} onClick={() => setConfirmSend(true)}>
                  Approve & send to {a.studentIds.length} student{a.studentIds.length === 1 ? '' : 's'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Why the AI drafted this" icon={<Lightbulb className="size-5" aria-hidden />} />
            <CardBody className="space-y-4">
              <ul className="space-y-3 text-sm text-ink-2">
                {a.rationale.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
              {a.reportNotes && (
                <blockquote className="border-l-2 border-brand-500 pl-3 text-sm italic text-ink-3">{a.reportNotes.length > 280 ? `${a.reportNotes.slice(0, 280)}…` : a.reportNotes}</blockquote>
              )}
              {cls && (
                <div className="border-t border-line pt-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium text-ink">
                    Curriculum alignment <FrameworkBadge framework={cls.framework} />
                  </p>
                  <ul className="space-y-1.5 text-sm text-ink-2">
                    {(a.curriculumRefs ?? a.competencies.flatMap((c) => curriculumRefsFor(a.classId, a.subject, c))).map((ref) => (
                      <li key={ref} className="rounded-lg bg-surface-2 px-3 py-2">
                        {ref}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-ink-3">{CURRICULUM_DISCLAIMER}</p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Note for parents" description="Plain-language home-support note, shared only after you approve" icon={<HeartHandshake className="size-5" aria-hidden />} />
            <CardBody className="space-y-3">
              {draft ? (
                <>
                  <label className="flex items-center gap-2 text-sm text-ink-2">
                    <input
                      type="checkbox"
                      checked={a.shareWithParents ?? false}
                      onChange={(e) => update(a.id, { shareWithParents: e.target.checked })}
                      className="size-4 rounded border-line-strong accent-brand-600"
                    />
                    Also share a home-support note with parents
                  </label>
                  {a.shareWithParents && (
                    <TextArea label="Note for parents" rows={4} value={a.parentNote ?? ''} onChange={(e) => update(a.id, { parentNote: e.target.value })} />
                  )}
                </>
              ) : a.shareWithParents && a.parentNote ? (
                <p className="text-sm text-ink-2">{a.parentNote}</p>
              ) : (
                <p className="text-sm text-ink-3">No note was shared with parents.</p>
              )}
              <p className="text-xs text-ink-3">Reaches parents through the app, SMS or a printed take-home note, depending on their chosen channel.</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Details for students" icon={<CalendarDays className="size-5" aria-hidden />} />
            <CardBody className="space-y-4">
              {draft ? (
                <>
                  <TextField label="Title" value={a.title} onChange={(e) => update(a.id, { title: e.target.value })} />
                  <TextField label="Due date" type="date" value={a.dueDate} onChange={(e) => update(a.id, { dueDate: e.target.value })} />
                  <TextArea label="Message to students" rows={4} value={a.messageToStudents} onChange={(e) => update(a.id, { messageToStudents: e.target.value })} />
                </>
              ) : (
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-ink-3">Due</dt>
                    <dd className="text-ink">{formatDate(a.dueDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-3">Message</dt>
                    <dd className="text-ink">{a.messageToStudents}</dd>
                  </div>
                </dl>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Recipients"
              description={
                draft
                  ? `${a.studentIds.length} selected · tick more to include students who are still developing`
                  : `${a.studentIds.length} student${a.studentIds.length === 1 ? '' : 's'} · ${a.competencies.join(', ')}`
              }
              icon={<Users className="size-5" aria-hidden />}
            />
            <ul className="max-h-80 divide-y divide-line overflow-y-auto">
              {(draft ? candidates : a.studentIds.map((sid) => getStudent(sid)).filter((s) => s !== undefined)).map((s) => {
                const attempt = !draft && s.id === DEMO_USERS.student.id ? attempts[a.id] : undefined
                return (
                  <li key={s.id}>
                    <label className="flex items-center gap-3 px-6 py-2.5 hover:bg-surface-2">
                      {draft && (
                        <input
                          type="checkbox"
                          checked={chosen.has(s.id)}
                          onChange={() =>
                            update(a.id, { studentIds: chosen.has(s.id) ? a.studentIds.filter((x) => x !== s.id) : [...a.studentIds, s.id] })
                          }
                          className="size-4 rounded border-line-strong accent-brand-600"
                        />
                      )}
                      <span className="flex-1 truncate text-sm text-ink">{s.name}</span>
                      {attempt ? (
                        <StatusBadge tone="good">
                          {attempt.score}/{attempt.total}
                        </StatusBadge>
                      ) : (
                        <span className="tabular text-xs text-ink-3">{draft ? `${s.average}%` : 'Not started'}</span>
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      </div>

      <Modal
        open={confirmSend}
        onClose={() => setConfirmSend(false)}
        title="Approve and send?"
        description={`${a.questions.length} questions will be sent to ${a.studentIds.length} students in ${cls?.name ?? 'the class'}.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmSend(false)}>
              Keep reviewing
            </Button>
            <Button
              icon={<SendHorizontal className="size-4" aria-hidden />}
              onClick={() => {
                send(a.id)
                setConfirmSend(false)
                notify('Assessment sent to students', { description: `${a.studentIds.length} students can now start “${a.title}”.` })
              }}
            >
              Approve & send
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">
          Students will see it under <span className="font-medium text-ink">Practice → From your teacher</span>.
          {a.shareWithParents && ' Their parents will receive the home-support note.'} After sending, the questions can no longer be edited.
        </p>
      </Modal>

      <Modal
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Discard this draft?"
        description="The draft and any edits you made will be deleted. This can't be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDiscard(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                remove(a.id)
                notify('Draft discarded', { tone: 'info' })
                navigate('/ai-assessments')
              }}
            >
              Discard draft
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">Nothing was sent to students.</p>
      </Modal>
    </>
  )
}
