import { Wand2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { SelectField } from '../../../components/ui/Field'
import { Modal } from '../../../components/ui/Modal'
import { useLiveData } from '../../../context/LiveDataContext'
import { useSession } from '../../../context/SessionContext'
import { useToast } from '../../../context/ToastContext'
import { DIAGNOSTIC_REPORTS } from '../../../data/diagnostics'
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

/**
 * "Generate guidance": the AI drafts a guidance plan for each chosen student's weakest competency gaps.
 * The plans arrive under "Awaiting review"; nothing reaches a student or parent until the teacher approves it.
 */
export function GenerateGuidanceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { role } = useSession()
  const { refresh } = useLiveData()
  const { notify } = useToast()
  const classes = classesInScope(role)
  const [classId, setClassId] = useState(classes[0]?.id ?? '')
  const [studentId, setStudentId] = useState('all')
  const [progress, setProgress] = useState<{ done: number; total: number; name: string } | null>(null)

  const students = getStudentsByClass(classId)
  const withGaps = students.filter(hasGap)
  const targets = studentId === 'all' ? withGaps.slice(0, MAX_STUDENTS) : students.filter((s) => s.id === studentId)

  const run = async () => {
    let made = 0
    let note = ''
    for (const [i, s] of targets.entries()) {
      setProgress({ done: i, total: targets.length, name: s.name })
      try {
        const result = await api<{ plans: GuidancePlan[]; reason?: string }>('/guidance/generate', { body: { studentId: s.id } })
        made += result.plans.length
        if (!result.plans.length && result.reason && targets.length === 1) note = result.reason
      } catch (error) {
        // Most likely the hourly limit or the server: stop here and say why.
        note = `Stopped at ${s.name}: ${(error as Error).message}`
        break
      }
    }
    await refresh()
    setProgress(null)
    notify(made ? `${made} guidance plan${made === 1 ? '' : 's'} ready for your review` : 'No new plans', {
      tone: made ? undefined : 'info',
      description: note || (made ? 'They are under Awaiting review.' : 'These students already have guidance for their gaps, or have no gaps recorded yet.'),
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={progress ? () => {} : onClose}
      title="Generate guidance"
      description="The AI reads each student’s competency gaps and drafts a guidance plan for your review. Nothing is shared until you approve it."
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
        {progress ? (
          <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-ink" role="status" aria-live="polite">
            Drafting a plan for {progress.name}… This takes up to half a minute per student.
          </p>
        ) : targets.length === 0 ? (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn-ink">No competency gaps are recorded for this class yet. Use Analyse exam results first, then come back.</p>
        ) : (
          studentId === 'all' &&
          withGaps.length > MAX_STUDENTS && <p className="text-xs text-ink-3">The first {MAX_STUDENTS} students are done now; generate again for the rest.</p>
        )}
      </div>
    </Modal>
  )
}
