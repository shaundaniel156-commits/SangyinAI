import { ChevronRight, CloudUpload, HardDrive } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getClass } from '../../data/classes'
import { getStudent } from '../../data/students'
import type { DiagnosticReport } from '../../types'
import { Avatar } from '../ui/Avatar'
import { StatusBadge } from '../ui/StatusBadge'

export function ProcessingBadge({ processing }: { processing: DiagnosticReport['processing'] }) {
  return processing === 'local' ? (
    <StatusBadge icon={HardDrive}>Processed on this device · refinement queued</StatusBadge>
  ) : (
    <StatusBadge icon={CloudUpload} tone="info">
      Refined after sync
    </StatusBadge>
  )
}

/** Stacked bar showing how a student's competencies split across the three levels. */
export function LevelSplit({ report }: { report: DiagnosticReport }) {
  const total = report.competencies.length || 1
  const parts = [
    { n: report.strengths.length, cls: 'bg-good', label: 'Strengths' },
    { n: report.developing.length, cls: 'bg-warn', label: 'Developing' },
    { n: report.needsSupport.length, cls: 'bg-bad', label: 'Needs support' },
  ]
  return (
    <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label={parts.map((p) => `${p.label}: ${p.n}`).join(', ')}>
      {parts.map((p) => p.n > 0 && <span key={p.label} className={p.cls} style={{ width: `${(p.n / total) * 100}%` }} />)}
    </div>
  )
}

/** Summary card for one student's diagnostic report. */
export function DiagnosticCard({ report }: { report: DiagnosticReport }) {
  const student = getStudent(report.studentId)
  return (
    <Link
      to={`/diagnostics/${report.id}`}
      className="card-glow group flex flex-col rounded-xl border border-line bg-surface p-5"
    >
      <div className="flex items-center gap-3">
        <Avatar initials={student?.initials ?? ''} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{student?.name}</p>
          <p className="truncate text-sm text-ink-3">
            {getClass(student?.classId ?? '')?.name} · {report.subject}
          </p>
        </div>
        <ChevronRight className="size-4 text-ink-3 group-hover:text-ink" aria-hidden />
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-ink-3">Areas requiring support</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {report.needsSupport.map((a) => (
          <StatusBadge key={a} tone="bad">
            {a}
          </StatusBadge>
        ))}
      </div>
      <div className="mt-4">
        <LevelSplit report={report} />
        <p className="mt-1.5 text-xs text-ink-3">
          {report.strengths.length} strengths · {report.developing.length} developing · {report.needsSupport.length} need support
        </p>
      </div>
      <div className="mt-4">
        <ProcessingBadge processing={report.processing} />
      </div>
    </Link>
  )
}
