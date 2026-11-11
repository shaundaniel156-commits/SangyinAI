import { useState } from 'react'
import { useLiveData } from '../../../context/LiveDataContext'
import { useToast } from '../../../context/ToastContext'
import {
  CONFIDENCE_OPTIONS,
  DIFFICULTY_OPTIONS,
  type ConfidenceChoice,
  type DifficultyChoice,
} from '../../../data/practice'
import { api } from '../../../lib/api'
import { cn } from '../../../lib/cn'
import type { PracticeActivity } from '../../../types'

interface FeedbackControlProps {
  /** The practice the student is telling their teacher about. */
  activity: PracticeActivity
}

/**
 * Difficulty + confidence self-report. Each choice is saved on the student's copy of the practice
 * (backend PATCH /practice/:id/feedback), where the teacher sees it beside the result.
 */
export function FeedbackControl({ activity }: FeedbackControlProps) {
  const { notify } = useToast()
  const { live, refresh } = useLiveData()
  const [difficulty, setDifficulty] = useState<DifficultyChoice | undefined>(activity.feedback)
  const [confidence, setConfidence] = useState<ConfidenceChoice | undefined>(activity.confidence)
  const [saving, setSaving] = useState(false)

  const save = async (patch: { feedback?: DifficultyChoice; confidence?: ConfidenceChoice }) => {
    if (!live) return notify('Not saved', { tone: 'info', description: 'Sign in while connected to tell your teacher.' })
    setSaving(true)
    try {
      await api(`/practice/${activity.id}/feedback`, { method: 'PATCH', body: patch })
      notify('Saved. Your teacher can see this.')
      // So the rest of the page (and the teacher's view after a reload) shows the new answer.
      void refresh()
    } catch (error) {
      notify('Not saved', { tone: 'info', description: (error as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4" aria-busy={saving}>
      <ChoiceGroup
        question="How difficult was this activity?"
        context={activity.title}
        options={DIFFICULTY_OPTIONS}
        value={difficulty}
        onChange={(v) => {
          setDifficulty(v)
          void save({ feedback: v })
        }}
      />
      <ChoiceGroup
        question="How confident do you feel?"
        context={activity.title}
        options={CONFIDENCE_OPTIONS}
        value={confidence}
        onChange={(v) => {
          setConfidence(v)
          void save({ confidence: v })
        }}
      />
      <p className="text-xs text-ink-3">Your answers are saved for your teacher, to help them plan what comes next.</p>
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
