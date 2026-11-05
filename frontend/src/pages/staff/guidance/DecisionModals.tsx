import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { SelectField, TextArea, TextField } from '../../../components/ui/Field'
import { Modal } from '../../../components/ui/Modal'
import { useGuidanceReview } from '../../../context/GuidanceReviewContext'
import { useLiveData } from '../../../context/LiveDataContext'
import { useToast } from '../../../context/ToastContext'
import { cn } from '../../../lib/cn'
import type { GuidancePlan } from '../../../types'

interface BaseProps {
  open: boolean
  onClose: () => void
}

/** Teacher edits to the suggested plan: the approach, the steps, the pacing and practice, and what the student and parents receive. */
export function EditPlanModal({ open, onClose, plan }: BaseProps & { plan: GuidancePlan }) {
  const { saveEdits } = useGuidanceReview()
  const { notify } = useToast()
  const [method, setMethod] = useState(plan.teachingApproach.method)
  const [rationale, setRationale] = useState(plan.teachingApproach.rationale)
  const [pacing, setPacing] = useState(plan.pacing)
  const [practice, setPractice] = useState(plan.practice.join('\n'))
  // One teaching step per line, as "Title: what to do".
  const [sequence, setSequence] = useState(plan.sequence.map((s) => (s.detail ? `${s.title}: ${s.detail}` : s.title)).join('\n'))
  const [studentSteps, setStudentSteps] = useState(plan.outputs.studentSequence.join('\n'))
  const [parentNote, setParentNote] = useState(plan.outputs.parentNote)

  const lines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean)
  const save = () => {
    saveEdits(plan.id, {
      method,
      rationale,
      pacing,
      practice: lines(practice),
      sequence: lines(sequence).map((line) => {
        const at = line.indexOf(':')
        return at < 0 ? { title: line, detail: '' } : { title: line.slice(0, at).trim(), detail: line.slice(at + 1).trim() }
      }),
      studentSequence: lines(studentSteps),
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
      <div className="space-y-4">
        <TextField label="Teaching approach" value={method} onChange={(e) => setMethod(e.target.value)} />
        <TextArea label="Why this approach" rows={3} value={rationale} onChange={(e) => setRationale(e.target.value)} />
        <TextArea label="Teaching steps" hint="One step per line, written as Title: what to do" rows={6} value={sequence} onChange={(e) => setSequence(e.target.value)} />
        <TextArea label="Pacing" rows={2} value={pacing} onChange={(e) => setPacing(e.target.value)} />
        <TextArea label="Practice activities" hint="One activity per line" rows={4} value={practice} onChange={(e) => setPractice(e.target.value)} />
        <TextArea label="Steps the student sees" hint="One step per line, in simple words. Shared with the student once you approve." rows={4} value={studentSteps} onChange={(e) => setStudentSteps(e.target.value)} />
        <TextArea label="Note for parents" hint="Sent to the student’s parents once you approve." rows={3} value={parentNote} onChange={(e) => setParentNote(e.target.value)} />
      </div>
    </Modal>
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
