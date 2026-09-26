import { useState } from 'react'
import { useToast } from '../../../context/ToastContext'
import {
  CONFIDENCE_OPTIONS,
  DIFFICULTY_OPTIONS,
  type ConfidenceChoice,
  type DifficultyChoice,
} from '../../../data/practice'
import { cn } from '../../../lib/cn'

interface FeedbackControlProps {
  activityTitle: string
  initialDifficulty?: DifficultyChoice
}

/** Difficulty + confidence self-report. Local state only — not saved in this prototype. */
export function FeedbackControl({ activityTitle, initialDifficulty }: FeedbackControlProps) {
  const { notify } = useToast()
  const [difficulty, setDifficulty] = useState<DifficultyChoice | undefined>(initialDifficulty)
  const [confidence, setConfidence] = useState<ConfidenceChoice | undefined>()

  const thank = () => notify('Thanks! Your teacher will see this.', { description: 'Feedback is not saved in this prototype.' })

  return (
    <div className="space-y-4">
      <ChoiceGroup
        question="How difficult was this activity?"
        context={activityTitle}
        options={DIFFICULTY_OPTIONS}
        value={difficulty}
        onChange={(v) => {
          setDifficulty(v)
          thank()
        }}
      />
      <ChoiceGroup
        question="How confident do you feel?"
        context={activityTitle}
        options={CONFIDENCE_OPTIONS}
        value={confidence}
        onChange={(v) => {
          setConfidence(v)
          thank()
        }}
      />
      <p className="text-xs text-ink-3">Your answers help your teacher plan what comes next. Not saved in this prototype.</p>
    </div>
  )
}

interface ChoiceGroupProps<T extends string> {
  question: string
  context: string
  options: readonly { id: T; label: string }[]
  value: T | undefined
  onChange: (v: T) => void
}

/** Friendly emoji for each self-report option (decorative; the label carries the meaning). */
const EMOJI: Record<string, string> = {
  easy: '😄',
  okay: '🙂',
  difficult: '😐',
  confident: '💪',
  unsure: '🤔',
  need_help: '🙋',
}

function ChoiceGroup<T extends string>({ question, context, options, value, onChange }: ChoiceGroupProps<T>) {
  return (
    <div role="radiogroup" aria-label={`${question} (${context})`}>
      <p className="text-sm font-semibold text-ink">{question}</p>
      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {options.map((o) => {
          const active = value === o.id
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.id)}
              className={cn(
                'flex min-h-12 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-all',
                active
                  ? 'border-brand-400/70 bg-brand-500/15 text-ink shadow-[0_0_0_1px_rgb(96_165_250/0.3),0_8px_24px_-12px_rgb(37_99_235/0.8)]'
                  : 'border-line-strong bg-surface/60 text-ink-2 hover:-translate-y-0.5 hover:border-brand-400/40 hover:text-ink',
              )}
            >
              <span className="text-xl leading-none" aria-hidden>
                {EMOJI[o.id] ?? '•'}
              </span>
              <span className="flex-1">{o.label}</span>
              {active && <span className="size-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgb(34_211_238)]" aria-hidden />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
