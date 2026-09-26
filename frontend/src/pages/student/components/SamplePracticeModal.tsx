import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { DemoNotice } from '../../../components/ui/DemoNotice'
import { Modal } from '../../../components/ui/Modal'
import { SAMPLE_PRACTICE_QUESTION } from '../../../data/practice'
import { cn } from '../../../lib/cn'
import type { PracticeActivity } from '../../../types'

interface SamplePracticeModalProps {
  activity: PracticeActivity | null
  onClose: () => void
}

/** Preview of a practice activity with one SAMPLE question. Nothing is graded or saved. */
export function SamplePracticeModal({ activity, onClose }: SamplePracticeModalProps) {
  const [choice, setChoice] = useState<string | null>(null)

  const close = () => {
    setChoice(null)
    onClose()
  }

  return (
    <Modal
      open={activity !== null}
      onClose={close}
      title={activity?.title ?? ''}
      description={activity ? `${activity.focus} · ${activity.questions} questions` : undefined}
      footer={
        <Button variant="secondary" onClick={close}>
          Close
        </Button>
      }
    >
      <DemoNotice>Sample question preview. Answers are not checked or saved in this prototype.</DemoNotice>
      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-ink">Sample question</legend>
        <p className="mt-2 text-base text-ink">{SAMPLE_PRACTICE_QUESTION.prompt}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {SAMPLE_PRACTICE_QUESTION.options.map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={choice === o}
              onClick={() => setChoice(o)}
              className={cn(
                'tabular h-12 rounded-lg border text-base font-medium transition-colors',
                choice === o ? 'border-brand-500 bg-brand-soft text-brand-ink' : 'border-line-strong bg-surface text-ink hover:bg-surface-2',
              )}
            >
              {o}
            </button>
          ))}
        </div>
      </fieldset>
      {choice && (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-lg bg-surface-2 px-3.5 py-2.5 text-sm text-ink-2">
          <CheckCircle2 className="size-4 text-ink-3" aria-hidden />
          Answer recorded (prototype)
        </p>
      )}
    </Modal>
  )
}
