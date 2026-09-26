import { CheckCircle2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { inputClasses } from '../../../components/ui/Field'
import { Modal } from '../../../components/ui/Modal'
import { useAiAssessments } from '../../../context/AiAssessmentsContext'
import { cn } from '../../../lib/cn'
import type { AiAssessment, AiQuestion } from '../../../types'

const normalise = (s: string) => s.toLowerCase().replace(/[\s,.]/g, '')

/** Open-ended items ("Answers will vary") count as done when attempted; the teacher reads them. */
function isCorrect(q: AiQuestion, given: string): boolean {
  if (!given.trim()) return false
  if (q.answer === 'Answers will vary') return true
  return q.answer.split('/').some((a) => normalise(a) === normalise(given)) || normalise(q.answer) === normalise(given)
}

/** Student view of a teacher-approved assessment, with instant marking and explanations. */
export function TakeAssessmentModal({ assessment: a, onClose }: { assessment: AiAssessment | null; onClose: () => void }) {
  const { recordAttempt } = useAiAssessments()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)

  if (!a) return null

  const score = a.questions.filter((q) => isCorrect(q, answers[q.id] ?? '')).length
  const answered = a.questions.filter((q) => (answers[q.id] ?? '').trim()).length

  const close = () => {
    setAnswers({})
    setChecked(false)
    onClose()
  }

  return (
    <Modal
      open
      size="lg"
      onClose={close}
      title={a.title}
      description={a.messageToStudents}
      footer={
        checked ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <span className="mr-auto self-center text-sm text-ink-3">
              {answered} of {a.questions.length} answered
            </span>
            <Button variant="secondary" onClick={close}>
              Finish later
            </Button>
            <Button
              disabled={answered === 0}
              onClick={() => {
                setChecked(true)
                recordAttempt(a.id, { score, total: a.questions.length })
              }}
            >
              Check my answers
            </Button>
          </>
        )
      }
    >
      {checked && (
        <div role="status" className="mb-5 rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand-ink">
          <p className="text-base font-semibold">
            You got {score} out of {a.questions.length}!
          </p>
          <p className="mt-0.5">Read the explanations below — they show you how to get there next time.</p>
        </div>
      )}
      <ol className="space-y-6">
        {a.questions.map((q, i) => {
          const given = answers[q.id] ?? ''
          const right = checked && isCorrect(q, given)
          return (
            <li key={q.id}>
              <p className="text-[15px] font-medium text-ink">
                <span className="mr-2 text-ink-3">{i + 1}.</span>
                {q.prompt}
              </p>
              {q.type === 'multiple_choice' && q.options ? (
                <div role="radiogroup" aria-label={`Question ${i + 1}`} className="mt-3 grid gap-2 sm:grid-cols-2">
                  {q.options.map((opt) => {
                    const picked = given === opt
                    return (
                      <label
                        key={opt}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                          checked && opt === q.answer
                            ? 'border-good/50 bg-good-soft text-good-ink'
                            : picked
                              ? checked
                                ? 'border-bad/50 bg-bad-soft text-bad-ink'
                                : 'border-brand-500 bg-brand-soft text-brand-ink'
                              : 'border-line text-ink-2 hover:bg-surface-2',
                          checked && 'cursor-default',
                        )}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          checked={picked}
                          disabled={checked}
                          onChange={() => setAnswers((x) => ({ ...x, [q.id]: opt }))}
                          className="size-4 accent-brand-600"
                        />
                        {opt}
                      </label>
                    )
                  })}
                </div>
              ) : (
                <input
                  aria-label={`Answer to question ${i + 1}`}
                  value={given}
                  disabled={checked}
                  onChange={(e) => setAnswers((x) => ({ ...x, [q.id]: e.target.value }))}
                  placeholder="Type your answer"
                  className={cn(inputClasses, 'mt-3 h-10')}
                />
              )}
              {checked && (
                <div className={cn('mt-3 flex gap-2 rounded-lg px-3 py-2 text-sm', right ? 'bg-good-soft text-good-ink' : 'bg-surface-2 text-ink-2')}>
                  {right ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> : <XCircle className="mt-0.5 size-4 shrink-0 text-bad" aria-hidden />}
                  <p>
                    {!right && q.answer !== 'Answers will vary' && <span className="font-medium text-ink">Answer: {q.answer}. </span>}
                    {q.explanation}
                  </p>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </Modal>
  )
}
