import { Check, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { TextArea, TextField, inputClasses } from '../../../components/ui/Field'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { DIFFICULTY_LABEL, QUESTION_TYPE_LABEL } from '../../../lib/aiAssessment'
import { cn } from '../../../lib/cn'
import type { AiQuestion } from '../../../types'

const DIFFICULTY_TONE = { foundation: 'good', core: 'info', stretch: 'accent' } as const

interface QuestionItemProps {
  index: number
  question: AiQuestion
  editable: boolean
  canRegenerate: boolean
  onChange: (q: AiQuestion) => void
  onRegenerate: () => void
  onRemove: () => void
}

/** One drafted question: read view with answer key, or an inline editor. */
export function QuestionItem({ index, question: q, editable, canRegenerate, onChange, onRegenerate, onRemove }: QuestionItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(q)

  const startEdit = () => {
    setDraft(q)
    setEditing(true)
  }

  if (editing) {
    const options = draft.options ?? []
    return (
      <li className="space-y-4 px-6 py-5">
        <QuestionMeta index={index} q={q} />
        <TextArea label="Question" rows={3} value={draft.prompt} onChange={(e) => setDraft({ ...draft, prompt: e.target.value })} />
        {draft.type === 'multiple_choice' ? (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">Options — select the correct answer</legend>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={draft.answer === opt}
                    onChange={() => setDraft({ ...draft, answer: opt })}
                    className="size-4 accent-brand-600"
                    aria-label={`Mark option ${i + 1} as correct`}
                  />
                  <input
                    value={opt}
                    aria-label={`Option ${i + 1}`}
                    onChange={(e) => {
                      const next = [...options]
                      next[i] = e.target.value
                      setDraft({ ...draft, options: next, answer: draft.answer === opt ? e.target.value : draft.answer })
                    }}
                    className={cn(inputClasses, 'h-10')}
                  />
                </div>
              ))}
            </div>
          </fieldset>
        ) : (
          <TextField label="Expected answer" value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} />
        )}
        <TextArea label="Explanation shown after answering" rows={2} value={draft.explanation} onChange={(e) => setDraft({ ...draft, explanation: e.target.value })} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!draft.prompt.trim() || !draft.answer.trim()}
            onClick={() => {
              onChange(draft)
              setEditing(false)
            }}
          >
            Save question
          </Button>
        </div>
      </li>
    )
  }

  return (
    <li className="group px-6 py-5">
      <div className="flex items-start justify-between gap-4">
        <QuestionMeta index={index} q={q} />
        {editable && (
          <div className="flex shrink-0 gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
            <IconAction label="Edit question" onClick={startEdit} icon={Pencil} />
            <IconAction label={canRegenerate ? 'Regenerate question' : 'No other questions available'} onClick={onRegenerate} icon={RefreshCw} disabled={!canRegenerate} />
            <IconAction label="Remove question" onClick={onRemove} icon={Trash2} danger />
          </div>
        )}
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-ink">{q.prompt}</p>
      {q.type === 'multiple_choice' && q.options ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {q.options.map((opt) => {
            const correct = opt === q.answer
            return (
              <li
                key={opt}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                  correct ? 'border-good/40 bg-good-soft font-medium text-good-ink' : 'border-line text-ink-2',
                )}
              >
                {correct ? <Check className="size-4 shrink-0" aria-hidden /> : <span className="size-4 shrink-0" aria-hidden />}
                {opt}
                {correct && <span className="sr-only">(correct answer)</span>}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-good/40 bg-good-soft px-3 py-2 text-sm font-medium text-good-ink">
          <Check className="size-4" aria-hidden />
          Expected answer: {q.answer}
        </p>
      )}
      <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-2">
        <span className="font-medium text-ink">Explanation: </span>
        {q.explanation}
      </p>
    </li>
  )
}

function QuestionMeta({ index, q }: { index: number; q: AiQuestion }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="tabular grid size-7 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">{index + 1}</span>
      <StatusBadge tone="neutral">{q.competency}</StatusBadge>
      <StatusBadge tone={DIFFICULTY_TONE[q.difficulty]}>{DIFFICULTY_LABEL[q.difficulty]}</StatusBadge>
      <span className="text-xs text-ink-3">{QUESTION_TYPE_LABEL[q.type]}</span>
    </div>
  )
}

function IconAction({ label, onClick, icon: Icon, disabled, danger }: { label: string; onClick: () => void; icon: typeof Pencil; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        'grid size-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-40',
        danger ? 'hover:text-bad-ink' : 'hover:text-ink',
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  )
}
