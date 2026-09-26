import {
  BookOpenCheck,
  CalendarClock,
  Check,
  ClipboardPen,
  GraduationCap,
  HeartHandshake,
  ListOrdered,
  PencilLine,
  PencilRuler,
  Printer,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GuidanceStatusBadge } from '../../components/domain/GuidanceStatusBadge'
import { Avatar } from '../../components/ui/Avatar'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { DemoNotice } from '../../components/ui/DemoNotice'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Tabs } from '../../components/ui/Tabs'
import { useGuidanceReview } from '../../context/GuidanceReviewContext'
import { useToast } from '../../context/ToastContext'
import { printSection } from '../../lib/print'
import { getClass } from '../../data/classes'
import { getDiagnosticForStudent } from '../../data/diagnostics'
import { getGuidance } from '../../data/guidance'
import { getStudent } from '../../data/students'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { EditPlanModal, OverrideModal, RevisionModal } from './guidance/DecisionModals'

type ModalId = 'edit' | 'revision' | 'override' | null

export function GuidanceDetailPage() {
  const { id = '' } = useParams()
  const base = getGuidance(id)
  const { resolve, decide, reset, decisions } = useGuidanceReview()
  const { notify } = useToast()
  const [modal, setModal] = useState<ModalId>(null)
  const [output, setOutput] = useState<'teacher' | 'parent' | 'student'>('teacher')

  if (!base) {
    return (
      <Card>
        <EmptyState icon={Sparkles} title="Guidance plan not found" action={<ButtonLink to="/guidance">Back to AI Guidance</ButtonLink>} />
      </Card>
    )
  }

  const plan = resolve(base)
  const student = getStudent(plan.studentId)
  const cls = student && getClass(student.classId)
  const diagnostic = student && getDiagnosticForStudent(student.id)
  const gapScore = student?.competencies.find((c) => c.name === plan.competencyGap)?.score
  const decided = Boolean(decisions[plan.id])

  const approve = () => {
    decide(plan.id, 'approved')
    notify('Plan approved', { description: 'Preview only — in the full system the parent note and student practice would now be shared.' })
  }

  return (
    <>
      <PageHeader
        back={{ to: '/guidance', label: 'AI Guidance' }}
        title={`Teaching guidance · ${plan.competencyGap}`}
        description={`${student?.name} · ${cls?.name} · ${plan.subject} · Suggested ${formatDate(plan.createdOn)}`}
        meta={
          <>
            <GuidanceStatusBadge status={plan.status} />
            <StatusBadge tone="accent" icon={Sparkles}>
              AI-suggested · teacher review required
            </StatusBadge>
            {plan.edited && <StatusBadge icon={PencilLine}>Edited by teacher</StatusBadge>}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ol className="xl:col-span-2" aria-label="Guidance workflow">
          <Step icon={UserRound} title="Student">
            <div className="flex flex-wrap items-center gap-3">
              <Avatar initials={student?.initials ?? ''} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{student?.name}</p>
                <p className="text-sm text-ink-3">
                  {cls?.name} · Overall average {student?.average}%
                </p>
              </div>
              <ButtonLink to={`/students/${student?.id}`} variant="ghost" size="sm">
                View profile
              </ButtonLink>
            </div>
          </Step>

          <Step icon={Target} title="Identified competency gap" tone="bad">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-ink">{plan.competencyGap}</p>
              <StatusBadge tone="bad">Needs support{gapScore !== undefined && ` · ${gapScore}%`}</StatusBadge>
            </div>
            <p className="mt-1 text-sm text-ink-3">{plan.curriculumReference}</p>
            {diagnostic && (
              <Link to={`/diagnostics/${diagnostic.id}`} className="mt-2 inline-block text-sm font-medium text-brand-ink hover:underline">
                See diagnostic evidence
              </Link>
            )}
          </Step>

          <Step icon={BookOpenCheck} title="Recommended teaching approach">
            <p className="font-medium text-ink">{plan.teachingApproach.method}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{plan.teachingApproach.rationale}</p>
          </Step>

          <Step icon={ListOrdered} title="Suggested sequence">
            <ol className="space-y-3">
              {plan.sequence.map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span className="tabular grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand-ink">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-ink">{s.title}</p>
                    <p className="text-sm text-ink-2">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Step>

          <Step icon={CalendarClock} title="Suggested pacing">
            <p className="text-sm text-ink-2">{plan.pacing}</p>
          </Step>

          <Step icon={PencilRuler} title="Practice recommendation">
            <ul className="space-y-2">
              {plan.practice.map((p) => (
                <li key={p} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink">
                  <PencilRuler className="size-4 shrink-0 text-ink-3" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </Step>

          <Step icon={ClipboardPen} title="Teacher decision" last tone="brand">
            <DecisionPanel
              status={plan.status}
              note={plan.teacherNote}
              decidedAt={plan.decidedAt}
              decided={decided}
              onApprove={approve}
              onEdit={() => setModal('edit')}
              onRevision={() => setModal('revision')}
              onOverride={() => setModal('override')}
              onReset={() => {
                reset(plan.id)
                notify('Decision cleared', { tone: 'info' })
              }}
            />
          </Step>
        </ol>

        <div className="space-y-6">
          <Card className="xl:sticky xl:top-24">
            <CardHeader title="Outputs from this plan" description="One plan, three versions for different readers" />
            <div className="px-4 pt-1">
              <Tabs
                label="Plan outputs"
                value={output}
                onChange={setOutput}
                tabs={[
                  { id: 'teacher', label: 'Teacher' },
                  { id: 'parent', label: 'Parent' },
                  { id: 'student', label: 'Student' },
                ]}
              />
            </div>
            <CardBody>
              <div className="print-target">
              <p className="mb-3 text-xs text-ink-3">
                {student?.name} · {plan.competencyGap} · {plan.curriculumReference}
              </p>
              {output === 'teacher' && (
                <OutputBlock icon={ClipboardPen} title="Lesson guidance sheet">
                  <p className="text-sm font-medium text-ink">{plan.teachingApproach.method}</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-2">
                    {plan.sequence.map((s) => (
                      <li key={s.title}>{s.title}</li>
                    ))}
                  </ol>
                  <p className="mt-2 text-sm text-ink-3">{plan.pacing}</p>
                  <p className="mt-3 text-sm text-ink-3">Practice materials</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-2">
                    {plan.practice.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </OutputBlock>
              )}
              {output === 'parent' && (
                <OutputBlock icon={HeartHandshake} title="Home-support note">
                  <p className="text-sm text-ink-3">Current Learning Focus</p>
                  <p className="font-medium text-ink">{plan.competencyGap}</p>
                  <p className="mt-3 text-sm text-ink-3">How you can help</p>
                  <p className="text-sm text-ink-2">{plan.outputs.parentNote}</p>
                </OutputBlock>
              )}
              {output === 'student' && (
                <OutputBlock icon={GraduationCap} title="Practice sequence">
                  <ol className="space-y-2">
                    {plan.outputs.studentSequence.map((s, i) => (
                      <li key={s} className="flex items-center gap-2 text-sm text-ink">
                        <span className="tabular grid size-5 place-items-center rounded-full bg-surface-3 text-[11px] font-semibold text-ink-2">{i + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </OutputBlock>
              )}
              </div>
              <Button variant="secondary" size="sm" className="mt-4 w-full" icon={<Printer className="size-4" aria-hidden />} onClick={printSection}>
                Print {output === 'teacher' ? 'lesson guidance sheet' : output === 'parent' ? 'take-home note' : 'practice sequence'}
              </Button>
              <p className={cn('mt-4 rounded-lg px-3 py-2 text-xs', plan.status === 'approved' ? 'bg-good-soft text-good-ink' : 'bg-surface-2 text-ink-3')}>
                {plan.status === 'approved'
                  ? 'Approved — ready to share with the parent and student.'
                  : 'Not shared yet. Parents and students only see this after you approve the plan.'}
              </p>
            </CardBody>
          </Card>
          <DemoNotice>Sample guidance content. AI generation and sharing are not connected in this prototype; decisions are kept only until the page is reloaded.</DemoNotice>
        </div>
      </div>

      {modal === 'edit' && <EditPlanModal open onClose={() => setModal(null)} plan={plan} />}
      {modal === 'revision' && <RevisionModal open onClose={() => setModal(null)} planId={plan.id} />}
      {modal === 'override' && <OverrideModal open onClose={() => setModal(null)} planId={plan.id} />}
    </>
  )
}

function Step({ icon: Icon, title, children, last, tone }: { icon: LucideIcon; title: string; children: ReactNode; last?: boolean; tone?: 'bad' | 'brand' }) {
  return (
    <li className="relative flex gap-4 pb-4 last:pb-0">
      {!last && <span className="absolute bottom-0 left-[19px] top-11 w-px bg-line-strong" aria-hidden />}
      <span
        className={cn(
          'relative z-[1] grid size-10 shrink-0 place-items-center rounded-full border',
          tone === 'bad' ? 'border-bad/30 bg-bad-soft text-bad-ink' : tone === 'brand' ? 'border-brand-300 bg-brand-soft text-brand-ink' : 'border-line bg-surface text-ink-2',
        )}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <Card className="min-w-0 flex-1">
        <div className="px-5 pb-5 pt-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">{title}</h2>
          {children}
        </div>
      </Card>
    </li>
  )
}

function OutputBlock({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-line p-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
        <Icon className="size-4 text-ink-3" aria-hidden />
        {title}
      </p>
      {children}
    </div>
  )
}

interface DecisionPanelProps {
  status: string
  note?: string
  decidedAt?: string
  decided: boolean
  onApprove: () => void
  onEdit: () => void
  onRevision: () => void
  onOverride: () => void
  onReset: () => void
}

function DecisionPanel({ status, note, decidedAt, decided, onApprove, onEdit, onRevision, onOverride, onReset }: DecisionPanelProps) {
  return (
    <div>
      {status !== 'pending_review' && (
        <div
          className={cn(
            'mb-4 rounded-lg px-4 py-3 text-sm',
            status === 'approved' ? 'bg-good-soft text-good-ink' : status === 'revision_requested' ? 'bg-warn-soft text-warn-ink' : 'bg-surface-3 text-ink-2',
          )}
        >
          <p className="font-medium">
            {status === 'approved' && 'You approved this plan.'}
            {status === 'revision_requested' && 'You requested a revision of this plan.'}
            {status === 'overridden' && 'You overrode this plan with your own approach.'}
            {decidedAt && <span className="font-normal"> · {decidedAt}</span>}
          </p>
          {note && <p className="mt-1">“{note}”</p>}
        </div>
      )}
      <p className="mb-3 text-sm text-ink-2">Review the plan above, then choose what should happen next. You stay in control of what is taught.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="success" icon={<Check className="size-4" aria-hidden />} onClick={onApprove} disabled={status === 'approved'}>
          Approve
        </Button>
        <Button variant="secondary" icon={<PencilLine className="size-4" aria-hidden />} onClick={onEdit}>
          Edit
        </Button>
        <Button variant="secondary" icon={<RotateCcw className="size-4" aria-hidden />} onClick={onRevision}>
          Request revision
        </Button>
        <Button variant="danger" icon={<ShieldAlert className="size-4" aria-hidden />} onClick={onOverride}>
          Override
        </Button>
        {decided && (
          <Button variant="ghost" onClick={onReset}>
            Clear decision
          </Button>
        )}
      </div>
    </div>
  )
}
