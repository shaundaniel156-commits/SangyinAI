import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { SelectField, TextArea, TextField } from '../../../components/ui/Field'
import { Modal } from '../../../components/ui/Modal'
import { useGuidanceReview } from '../../../context/GuidanceReviewContext'
import { useLiveData } from '../../../context/LiveDataContext'
import { useToast } from '../../../context/ToastContext'
import { cn } from '../../../lib/cn'
import type { GuidancePlan, GuidanceStep } from '../../../types'

interface BaseProps {
  open: boolean
  onClose: () => void
}

/** A step with its empty parts left out, or nothing when the step is blank. */
function tidy(steps: GuidanceStep[]): GuidanceStep[] {
  return steps
    .filter((s) => s.title.trim() || s.detail.trim())
    .map((s) => ({
      title: s.title.trim(),
      detail: s.detail.trim(),
      ...(s.minutes ? { minutes: Math.min(120, Math.max(1, Math.round(s.minutes))) } : {}),
      ...(s.example?.trim() ? { example: s.example.trim() } : {}),
      ...(s.check?.trim() ? { check: s.check.trim() } : {}),
    }))
}

/** Teacher edits to the suggested plan: the approach, every teaching step, the pacing and practice, the student's guide and the note for parents. */
export function EditPlanModal({ open, onClose, plan }: BaseProps & { plan: GuidancePlan }) {
  const { saveEdits } = useGuidanceReview()
  const { notify } = useToast()
  const [method, setMethod] = useState(plan.teachingApproach.method)
  const [rationale, setRationale] = useState(plan.teachingApproach.rationale)
  const [pacing, setPacing] = useState(plan.pacing)
  const [practice, setPractice] = useState(plan.practice.join('\n'))
  const [sequence, setSequence] = useState<GuidanceStep[]>(plan.sequence)
  // Older plans list the student's steps by title only.
  const [guide, setGuide] = useState<GuidanceStep[]>(plan.outputs.studentGuide ?? plan.outputs.studentSequence.map((title) => ({ title, detail: '' })))
  const [parentNote, setParentNote] = useState(plan.outputs.parentNote)

  const save = () => {
    saveEdits(plan.id, {
      method,
      rationale,
      pacing,
      practice: practice.split('\n').map((l) => l.trim()).filter(Boolean),
      sequence: tidy(sequence),
      studentGuide: tidy(guide),
      parentNote: parentNote.trim(),
    })
    notify('Changes saved', { description: 'Your version replaces the AI’s suggestion.' })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Edit guidance plan"
      description="Adjust the suggestion to fit your class. Your version replaces the suggested one."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save changes</Button>
        </>
      }
    >
      <div className="space-y-5">
        <TextField label="Teaching approach" value={method} onChange={(e) => setMethod(e.target.value)} />
        <TextArea label="Why this approach" rows={3} value={rationale} onChange={(e) => setRationale(e.target.value)} />
        <StepsEditor legend="Teaching steps" hint="What you do and say in each step, with an example for the board and a question to check understanding." steps={sequence} onChange={setSequence} minutes />
        <TextArea label="Pacing" rows={2} value={pacing} onChange={(e) => setPacing(e.target.value)} />
        <TextArea label="Practice activities" hint="One activity per line" rows={4} value={practice} onChange={(e) => setPractice(e.target.value)} />
        <StepsEditor legend="The student’s step-by-step guide" hint="Written to the student in simple words. Shared with them once you approve." steps={guide} onChange={setGuide} checkLabel="Check yourself" />
        <TextArea label="Note for parents" hint="Sent to the student’s parents once you approve." rows={3} value={parentNote} onChange={(e) => setParentNote(e.target.value)} />
      </div>
    </Modal>
  )
}

interface StepsEditorProps {
  legend: string
  hint: string
  steps: GuidanceStep[]
  onChange: (steps: GuidanceStep[]) => void
  /** Teaching steps carry the minutes each takes. */
  minutes?: boolean
  checkLabel?: string
}

/** The steps of a plan, each with its title, what to do, an example and a check; steps can be added and removed. */
function StepsEditor({ legend, hint, steps, onChange, minutes, checkLabel = 'Check before moving on' }: StepsEditorProps) {
  const set = (i: number, patch: Partial<GuidanceStep>) => onChange(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">{legend}</legend>
      <p className="mt-0.5 text-xs text-ink-3">{hint}</p>
      <ol className="mt-2 space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="rounded-lg border border-line p-3">
            <div className="flex items-end gap-2">
              <TextField label={`Step ${i + 1}`} value={s.title} onChange={(e) => set(i, { title: e.target.value })} className="min-w-0 flex-1" />
              {minutes && (
                <TextField label="Minutes" type="number" min={1} max={120} value={s.minutes ?? ''} onChange={(e) => set(i, { minutes: e.target.value ? Number(e.target.value) : undefined })} className="w-24" />
              )}
              <Button variant="ghost" size="sm" onClick={() => onChange(steps.filter((_, j) => j !== i))} icon={<Trash2 className="size-4" aria-hidden />}>
                Remove
              </Button>
            </div>
            <TextArea className="mt-2" label="What to do" rows={3} value={s.detail} onChange={(e) => set(i, { detail: e.target.value })} />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <TextArea label="Example" rows={2} value={s.example ?? ''} onChange={(e) => set(i, { example: e.target.value })} />
              <TextArea label={checkLabel} rows={2} value={s.check ?? ''} onChange={(e) => set(i, { check: e.target.value })} />
            </div>
          </li>
        ))}
      </ol>
      <Button variant="secondary" size="sm" className="mt-2" disabled={steps.length >= 10} onClick={() => onChange([...steps, { title: '', detail: '' }])} icon={<Plus className="size-4" aria-hidden />}>
        Add a step
      </Button>
    </fieldset>
  )
}

const REVISION_REASONS = ['Too fast for this learner', 'Approach not suitable for my class', 'Needs local examples', 'Practice too difficult', 'Other']

export function RevisionModal({ open, onClose, planId }: BaseProps & { planId: string }) {
  const { decide, regenerate } = useGuidanceReview()
  const { live } = useLiveData()
  const { notify } = useToast()
  const [reasons, setReasons] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const toggle = (r: string) => setReasons((x) => (x.includes(r) ? x.filter((y) => y !== r) : [...x, r]))

  // The AI rewrites the plan following the request. If it can't, the request is kept on the plan instead.
  const submit = async () => {
    const note = [reasons.join(', '), comment.trim()].filter(Boolean).join(' — ')
    if (live) {
      setBusy(true)
      try {
        await regenerate(planId, note)
        notify('Plan rewritten', { description: 'The AI followed your request. Review the new version.' })
        onClose()
        return
      } catch (error) {
        notify('Not rewritten yet', { tone: 'info', description: (error as Error).message })
      } finally {
        setBusy(false)
      }
    }
    decide(planId, 'revision_requested', note || undefined)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request a revision"
      description="Tell the AI what should change. It rewrites the plan and sends it back for your review."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy || (!reasons.length && !comment.trim())}>
            {busy ? 'Rewriting the plan…' : 'Rewrite the plan'}
          </Button>
        </>
      }
    >
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">What needs to change?</legend>
        <div className="flex flex-wrap gap-2">
          {REVISION_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={reasons.includes(r)}
              onClick={() => toggle(r)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm',
                reasons.includes(r) ? 'border-brand-500 bg-brand-soft text-brand-ink' : 'border-line text-ink-2 hover:bg-surface-2',
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </fieldset>
      <TextArea className="mt-4" label="Comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="e.g. Use market and farming examples familiar to the class." />
    </Modal>
  )
}

const OVERRIDE_METHODS = ['Worked examples', 'Peer learning', 'Visual aids', 'Whole-class revision', 'Other (describe below)']

export function OverrideModal({ open, onClose, planId }: BaseProps & { planId: string }) {
  const { decide } = useGuidanceReview()
  const { notify } = useToast()
  const [method, setMethod] = useState(OVERRIDE_METHODS[0]!)
  const [plan, setPlan] = useState('')

  const submit = () => {
    decide(planId, 'overridden', `${method}${plan.trim() ? `: ${plan.trim()}` : ''}`)
    notify('Plan overridden', { description: 'Your approach replaces the suggestion.' })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Override with your own approach"
      description="The suggestion will not be used. Record what you will do instead."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit}>
            Override plan
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <SelectField label="Your teaching approach" value={method} onChange={(e) => setMethod(e.target.value)} options={OVERRIDE_METHODS.map((m) => ({ value: m, label: m }))} />
        <TextArea label="Your plan" rows={4} value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Describe what you will teach and how." />
      </div>
    </Modal>
  )
}
