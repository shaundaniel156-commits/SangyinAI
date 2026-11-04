import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { api } from '../../../lib/api'
import { cn } from '../../../lib/cn'
import type { AiAssessment, Student } from '../../../types'

/** One uploaded photo of written work, with the AI's marking (backend GET /ai/assessments/:id/work/:studentId). */
interface Work {
  questionId: string
  prompt: string
  answer: string
  image: string
  /** null: the AI could not mark it, so the teacher reads it. */
  correct: boolean | null
  feedback: string
  uploadedOn: string
}

/** The photos a student uploaded for the written-work questions of a sent assessment, for the teacher to read. */
export function StudentWorkModal({ assessment: a, student, onClose }: { assessment: AiAssessment; student: Student | null; onClose: () => void }) {
  const [work, setWork] = useState<Work[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!student) return
    setWork(null)
    setError('')
    api<Work[]>(`/ai/assessments/${a.id}/work/${student.id}`)
      .then(setWork)
      .catch((e: Error) => setError(e.message))
  }, [a.id, student])

  return (
    <Modal open={student !== null} onClose={onClose} size="lg" title={student ? `${student.name}’s written work` : ''} description={a.title}>
      {error ? (
        <p className="text-sm text-bad-ink">{error}</p>
      ) : !work ? (
        <p className="text-sm text-ink-3">Loading…</p>
      ) : work.length === 0 ? (
        <p className="text-sm text-ink-3">No photos uploaded yet.</p>
      ) : (
        <ol className="space-y-6">
          {work.map((w, i) => {
            const n = a.questions.findIndex((q) => q.id === w.questionId) + 1 || i + 1
            const tone = w.correct === null ? 'bg-brand-soft text-brand-ink' : w.correct ? 'bg-good-soft text-good-ink' : 'bg-surface-2 text-ink-2'
            const Icon = w.correct === null ? Clock : w.correct ? CheckCircle2 : XCircle
            return (
              <li key={w.questionId}>
                <p className="text-[15px] font-medium text-ink">
                  <span className="mr-2 text-ink-3">{n}.</span>
                  {w.prompt}
                </p>
                <img src={w.image} alt={`Work for question ${n}`} className="mt-3 max-h-[28rem] w-auto rounded-lg border border-line" />
                <div className={cn('mt-3 flex gap-2 rounded-lg px-3 py-2 text-sm', tone)}>
                  <Icon className={cn('mt-0.5 size-4 shrink-0', w.correct === false && 'text-bad')} aria-hidden />
                  <div className="min-w-0">
                    <p className="font-medium">
                      {w.correct === null ? 'The AI could not mark this — please read it yourself' : w.correct ? 'Marked correct by the AI' : 'Marked not yet correct by the AI'}
                    </p>
                    {w.feedback && <p className="mt-0.5">{w.feedback}</p>}
                    <p className="mt-1 whitespace-pre-line text-xs opacity-80">Model answer: {w.answer}</p>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </Modal>
  )
}
