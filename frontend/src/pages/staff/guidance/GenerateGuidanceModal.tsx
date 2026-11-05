import { Wand2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { SelectField } from '../../../components/ui/Field'
import { Modal } from '../../../components/ui/Modal'
import { useLiveData } from '../../../context/LiveDataContext'
import { useSession } from '../../../context/SessionContext'
import { useToast } from '../../../context/ToastContext'
import { DIAGNOSTIC_REPORTS } from '../../../data/diagnostics'
import { GUIDANCE_PLANS } from '../../../data/guidance'
import { classesInScope } from '../../../data/selectors'
import { getStudentsByClass } from '../../../data/students'
import { api } from '../../../lib/api'
import type { GuidancePlan, Student } from '../../../types'

// Each student is one or two requests to the AI, so a whole class is done this many students at a time.
const MAX_STUDENTS = 12

/** A gap is on record for the student: in their mastery scores, or in a diagnostic report (Analyse exam results). */
function hasGap(s: Student): boolean {
  return s.needsSupport || s.competencies.some((c) => c.level !== 'strength') || DIAGNOSTIC_REPORTS.some((r) => r.studentId === s.id && r.needsSupport.length + r.developing.length > 0)
}

/** The student already has a plan in use: one waiting for review, or one approved. */
function hasPlan(s: Student): boolean {
  return GUIDANCE_PLANS.some((p) => p.studentId === s.id && (p.status === 'pending_review' || p.status === 'approved'))
}

/** What the server returns for one student: the plans it drafted, or the drafts already waiting and why nothing new was made. */
interface Generated {
  plans: GuidancePlan[]
  waiting?: GuidancePlan[]
  reason?: string
}

/**
 * "Generate guidance": the AI drafts a guidance plan for each chosen student's weakest competency gaps, and the
 * teacher lands on the draft to edit it. Students who already have an approved plan get a new version (the old one
 * stays until the new one is approved). Nothing reaches a student or parent until the teacher approves it.
 */
export function GenerateGuidanceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { role } = useSession()
  const { refresh } = useLiveData()
  const { notify } = useToast()
  const navigate = useNavigate()
  const classes = classesInScope(role)
  const [classId, setClassId] = useState(classes[0]?.id ?? '')
  const [studentId, setStudentId] = useState('all')
  // null: decided by the class (on when every student with gaps already has a plan, so a press still makes a draft).
  const [againChoice, setAgainChoice] = useState<boolean | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number; name: string } | null>(null)

  const students = getStudentsByClass(classId)
  const withGaps = students.filter(hasGap)
  const covered = withGaps.filter(hasPlan)
  const one = studentId !== 'all'
  // Choosing one student always means "draft for them now".
  const again = one || (againChoice ?? (withGaps.length > 0 && covered.length === withGaps.length))
  const targets = one ? students.filter((s) => s.id === studentId) : withGaps.slice(0, MAX_STUDENTS)

  const run = async () => {
    const made: GuidancePlan[] = []
    const waiting: GuidancePlan[] = []
    let note = ''
    for (const [i, s] of targets.entries()) {
      setProgress({ done: i, total: targets.length, name: s.name })
      try {
        const result = await api<Generated>('/guidance/generate', { body: { studentId: s.id, again } })
        made.push(...result.plans)
        waiting.push(...(result.waiting ?? []))
        if (!result.plans.length && result.reason && targets.length === 1) note = result.reason
      } catch (error) {
        // Most likely the hourly limit or the server: stop here and say why.
        note = `Stopped at ${s.name}: ${(error as Error).message}`
        break
      }
    }
    await refresh()
    setProgress(null)
    onClose()

    // One draft: open it, ready to edit. Nothing new but a draft is already waiting: open that one.
    const landOn = made.length === 1 ? made[0] : made.length === 0 ? waiting[0] : undefined
    if (made.length) {
      notify(made.length === 1 ? 'Draft ready' : `${made.length} drafts ready for your review`, {
        description: made.length === 1 ? 'Read it, press Edit to change anything, then approve to share it.' : 'They are under Awaiting review. Open each to edit and approve.',
      })
    } else {
      notify(landOn ? 'A draft is already waiting' : 'No new drafts', {
        tone: 'info',
        description: note || (landOn ? 'Edit or approve it before generating another.' : 'No competency gaps are recorded for these students yet.'),
      })
    }
    if (landOn) navigate(`/guidance/${landOn.id}`)
  }

  return (
    <Modal
      open={open}
      onClose={progress ? () => {} : onClose}
      title="Generate guidance"
      description="The AI reads each student’s competency gaps and writes a draft plan. You edit it, then approve it; nothing is shared before that."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={progress !== null}>
            Cancel
          </Button>
          <Button onClick={() => void run()} disabled={progress !== null || targets.length === 0} icon={<Wand2 className="size-4" aria-hidden />}>
            {progress ? `Drafting ${progress.done + 1} of ${progress.total}…` : `Generate for ${targets.length} student${targets.length === 1 ? '' : 's'}`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <SelectField
          label="Class"
          value={classId}
          disabled={progress !== null}
          onChange={(e) => {
            setClassId(e.target.value)
            setStudentId('all')
            setAgainChoice(null)
          }}
          options={classes.map((c) => ({ value: c.id, label: c.name }))}
        />
        <SelectField
          label="Student"
          value={studentId}
          disabled={progress !== null}
          onChange={(e) => setStudentId(e.target.value)}
          options={[{ value: 'all', label: `All students with gaps (${withGaps.length})` }, ...students.map((s) => ({ value: s.id, label: s.name }))]}
        />
        {!one && covered.length > 0 && (
          <label className="flex items-start gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={again} disabled={progress !== null} onChange={(e) => setAgainChoice(e.target.checked)} className="mt-0.5 size-4 rounded border-line-strong accent-brand-600" />
            <span>
              Write a new draft for the {covered.length} student{covered.length === 1 ? '' : 's'} who already {covered.length === 1 ? 'has' : 'have'} a plan
              <span className="block text-xs text-ink-3">The current plan stays in use until you approve the new one.</span>
            </span>
          </label>
        )}
        {progress ? (
          <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-ink" role="status" aria-live="polite">
            Drafting a plan for {progress.name}… This takes up to half a minute per student.
          </p>
        ) : targets.length === 0 ? (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn-ink">No competency gaps are recorded for this class yet. Use Analyse exam results first, then come back.</p>
        ) : (
          !one && withGaps.length > MAX_STUDENTS && <p className="text-xs text-ink-3">The first {MAX_STUDENTS} students are done now; generate again for the rest.</p>
        )}
      </div>
    </Modal>
  )
}
