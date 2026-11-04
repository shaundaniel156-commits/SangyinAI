import { Camera, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { inputClasses } from '../../../components/ui/Field'
import { Modal } from '../../../components/ui/Modal'
import { useAiAssessments, type MarkedAttempt, type WorkUpload } from '../../../context/AiAssessmentsContext'
import { cn } from '../../../lib/cn'
import { readBase64, shrinkPhoto } from '../../../lib/photo'
import type { AiAssessment, AiQuestion } from '../../../types'

const normalise = (s: string) => s.toLowerCase().replace(/[\s,.]/g, '')
// Photos of written work are shrunk to this before upload: readable, and small enough to send several at once.
const WORK_PHOTO_PX = 1600

/** Open-ended items ("Answers will vary") count as done when attempted; the teacher reads them. */
function isCorrect(q: AiQuestion, given: string): boolean {
  if (!given.trim()) return false
  if (q.answer === 'Answers will vary') return true
  return q.answer.split('/').some((a) => normalise(a) === normalise(given)) || normalise(q.answer) === normalise(given)
}

/** A photo the student picked for a written-work question, with a preview address for this page. */
interface PickedPhoto {
  file: File
  url: string
}

/**
 * Student view of a teacher-approved assessment, with marking and explanations. Signed in, the answers are
 * marked and saved by the server (which also sends the answers and explanations back); offline, they are
 * marked here. Written-work questions are done on paper: the student uploads a photo, which the server's AI marks.
 */
export function TakeAssessmentModal({ assessment: a, onClose }: { assessment: AiAssessment | null; onClose: () => void }) {
  const { recordAttempt, submitAnswers } = useAiAssessments()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [photos, setPhotos] = useState<Record<string, PickedPhoto>>({})
  const [checked, setChecked] = useState(false)
  const [marked, setMarked] = useState<MarkedAttempt | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!a) return null

  const givenFor = (q: AiQuestion) => (q.type === 'written_work' ? (photos[q.id] ? 'photo' : '') : (answers[q.id] ?? ''))

  // After server marking, each question carries its answer, explanation and feedback from the server.
  // Offline, written work can't be checked: it waits for the teacher and isn't counted in the score.
  const questions = a.questions.map((q) => {
    const m = marked?.questions.find((x) => x.id === q.id)
    if (m) return { ...q, answer: m.answer, explanation: m.explanation, correct: m.correct, feedback: m.feedback, pending: m.pending ?? false }
    const given = givenFor(q)
    return { ...q, correct: q.type === 'written_work' ? false : isCorrect(q, given), feedback: undefined, pending: q.type === 'written_work' && given !== '' }
  })
  const score = marked ? marked.score : questions.filter((q) => q.correct).length
  const pending = questions.filter((q) => q.pending).length
  const answered = a.questions.filter((q) => givenFor(q).trim()).length

  const clearPhotos = () => {
    for (const p of Object.values(photos)) URL.revokeObjectURL(p.url)
    setPhotos({})
  }

  const close = () => {
    setAnswers({})
    clearPhotos()
    setChecked(false)
    setMarked(null)
    setError(null)
    onClose()
  }

  const pickPhoto = (questionId: string, file: File) => {
    setPhotos((p) => {
      if (p[questionId]) URL.revokeObjectURL(p[questionId].url)
      return { ...p, [questionId]: { file, url: URL.createObjectURL(file) } }
    })
  }
  const removePhoto = (questionId: string) => {
    setPhotos((p) => {
      const { [questionId]: gone, ...rest } = p
      if (gone) URL.revokeObjectURL(gone.url)
      return rest
    })
  }

  const check = async () => {
    setBusy(true)
    setError(null)
    try {
      const work: Record<string, WorkUpload> = {}
      for (const [id, p] of Object.entries(photos)) {
        const small = await shrinkPhoto(p.file, WORK_PHOTO_PX).catch(() => p.file)
        work[id] = { mimeType: small.type === 'image/png' || small.type === 'image/webp' ? small.type : 'image/jpeg', data: await readBase64(small) }
      }
      const result = await submitAnswers(a.id, answers, work)
      if (result) setMarked(result)
      else recordAttempt(a.id, { score, total: a.questions.length })
      setChecked(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
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
              {error ? <span className="text-bad-ink">{error}</span> : <>{answered} of {a.questions.length} answered</>}
            </span>
            <Button variant="secondary" onClick={close}>
              Finish later
            </Button>
            <Button disabled={answered === 0 || busy} onClick={check}>
              {busy ? (Object.keys(photos).length ? 'Sending your work…' : 'Checking…') : 'Check my answers'}
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
          <p className="mt-0.5">
            {pending > 0
              ? `${pending} piece${pending === 1 ? '' : 's'} of written work will be marked by your teacher. Read the explanations below — they show you how to get there next time.`
              : 'Read the explanations below — they show you how to get there next time.'}
          </p>
        </div>
      )}
      <ol className="space-y-6">
        {questions.map((q, i) => {
          const given = givenFor(q)
          const right = checked && q.correct
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
              ) : q.type === 'written_work' ? (
                <WorkPhotoField index={i} photo={photos[q.id]} disabled={checked} onPick={(file) => pickPhoto(q.id, file)} onRemove={() => removePhoto(q.id)} />
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
              {checked &&
                (q.pending ? (
                  <div className="mt-3 flex gap-2 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-ink">
                    <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <p>Your work has been sent to your teacher to mark.</p>
                  </div>
                ) : (
                  <div className={cn('mt-3 flex gap-2 rounded-lg px-3 py-2 text-sm', right ? 'bg-good-soft text-good-ink' : 'bg-surface-2 text-ink-2')}>
                    {right ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> : <XCircle className="mt-0.5 size-4 shrink-0 text-bad" aria-hidden />}
                    <p>
                      {!right && q.answer !== 'Answers will vary' && q.type !== 'written_work' && <span className="font-medium text-ink">Answer: {q.answer}. </span>}
                      {q.feedback || q.explanation}
                    </p>
                  </div>
                ))}
            </li>
          )
        })}
      </ol>
    </Modal>
  )
}

/** "Do it on paper, then upload a photo": the picker, with a preview once a photo is chosen. */
function WorkPhotoField({ index, photo, disabled, onPick, onRemove }: { index: number; photo?: PickedPhoto; disabled: boolean; onPick: (file: File) => void; onRemove: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className="mt-3">
      <p className="text-sm text-ink-2">Work this out on paper, showing your steps. Then take a clear photo of your work and upload it.</p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label={`Photo of your work for question ${index + 1}`}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onPick(file)
          e.target.value = ''
        }}
      />
      {photo ? (
        <div className="mt-2 flex flex-wrap items-start gap-3">
          <img src={photo.url} alt={`Your work for question ${index + 1}`} className="max-h-48 rounded-lg border border-line" />
          {!disabled && (
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="secondary" onClick={() => input.current?.click()}>
                Retake
              </Button>
              <Button size="sm" variant="secondary" onClick={onRemove}>
                Remove
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Button size="sm" variant="secondary" className="mt-2" disabled={disabled} icon={<Camera className="size-4" aria-hidden />} onClick={() => input.current?.click()}>
          Upload a photo of your work
        </Button>
      )}
    </div>
  )
}
