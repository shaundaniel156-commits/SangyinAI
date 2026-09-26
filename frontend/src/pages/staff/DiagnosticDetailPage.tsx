import { AlertCircle, CheckCircle2, CircleDot, CircleMinus, MessageSquareText, Sparkles, Stethoscope, UserRound, XCircle, type LucideIcon } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { ProcessingBadge } from '../../components/domain/DiagnosticCard'
import { CompetencyList } from '../../components/domain/CompetencyList'
import { FrameworkBadge } from '../../components/domain/FrameworkBadge'
import { GuidanceStatusBadge } from '../../components/domain/GuidanceStatusBadge'
import { Avatar } from '../../components/ui/Avatar'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { DemoNotice } from '../../components/ui/DemoNotice'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { LEVEL_TONE, StatusBadge } from '../../components/ui/StatusBadge'
import { getClass } from '../../data/classes'
import { getStudentFeedbackSignals } from '../../data/studentFeedback'
import { getDiagnostic } from '../../data/diagnostics'
import { getGuidance } from '../../data/guidance'
import { getStudent } from '../../data/students'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import type { DiagnosticEvidence } from '../../types'

const OUTCOME: Record<DiagnosticEvidence['outcome'], { label: string; icon: LucideIcon; tone: 'good' | 'warn' | 'bad' }> = {
  correct: { label: 'Correct', icon: CheckCircle2, tone: 'good' },
  partial: { label: 'Partly correct', icon: CircleMinus, tone: 'warn' },
  incorrect: { label: 'Incorrect', icon: XCircle, tone: 'bad' },
}

const COLUMNS = [
  { key: 'strengths', title: 'Strengths', icon: CheckCircle2, accent: 'border-t-good', iconCls: 'text-good', empty: 'No secure areas yet' },
  { key: 'developing', title: 'Developing areas', icon: CircleDot, accent: 'border-t-warn', iconCls: 'text-warn', empty: 'None' },
  { key: 'needsSupport', title: 'Areas requiring support', icon: AlertCircle, accent: 'border-t-bad', iconCls: 'text-bad', empty: 'None — no area currently requires support' },
] as const

export function DiagnosticDetailPage() {
  const { id = '' } = useParams()
  const report = getDiagnostic(id)
  const student = report && getStudent(report.studentId)

  if (!report || !student) {
    return (
      <Card>
        <EmptyState icon={Stethoscope} title="Diagnostic report not found" action={<ButtonLink to="/diagnostics">Back to diagnostics</ButtonLink>} />
      </Card>
    )
  }

  const cls = getClass(student.classId)
  const guidance = report.guidanceId ? getGuidance(report.guidanceId) : undefined
  const feedback = getStudentFeedbackSignals(student, report.subject)

  return (
    <>
      <PageHeader
        back={{ to: '/diagnostics', label: 'Diagnostics' }}
        title="Diagnostic report"
        description={`${report.subject} · Updated ${formatDate(report.generatedOn)}`}
        meta={
          <>
            <FrameworkBadge framework={student.framework} />
            <ProcessingBadge processing={report.processing} />
          </>
        }
        actions={
          <>
            <ButtonLink to={`/students/${student.id}`} variant="secondary" icon={<UserRound className="size-4" aria-hidden />}>
              Student profile
            </ButtonLink>
            {guidance && (
              <ButtonLink to={`/guidance/${guidance.id}`} icon={<Sparkles className="size-4" aria-hidden />}>
                Review teaching guidance
              </ButtonLink>
            )}
          </>
        }
      />

      {report.processing === 'local' && (
        <DemoNotice className="mb-6">
          Diagnosed on this device so it works offline. Complex or ambiguous cases are queued and refined by the larger cloud model once the
          school is back online.
        </DemoNotice>
      )}

      <Card>
        <div className="grid grid-cols-1 divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="flex items-center gap-3 p-5">
            <Avatar initials={student.initials} />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-3">Student</p>
              <p className="truncate font-semibold text-ink">{student.name}</p>
              <p className="truncate text-sm text-ink-3">{cls?.name}</p>
            </div>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-3">Subject</p>
            <p className="mt-1 font-semibold text-ink">{report.subject}</p>
            <p className="text-sm text-ink-3">{cls?.level}</p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-3">Identified learning areas</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {report.identifiedAreas.length ? (
                report.identifiedAreas.map((a) => (
                  <StatusBadge key={a} tone={report.needsSupport.includes(a) ? 'bad' : 'warn'} className="text-[13px]">
                    {a}
                  </StatusBadge>
                ))
              ) : (
                <span className="text-sm text-ink-3">None identified</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = report[col.key]
          return (
            <Card key={col.key} className={cn('border-t-4', col.accent)}>
              <div className="flex items-center gap-2 px-5 pt-4">
                <col.icon className={cn('size-5', col.iconCls)} aria-hidden />
                <h2 className="text-[15px] font-semibold text-ink">{col.title}</h2>
                <span className="tabular ml-auto rounded-full bg-surface-3 px-2 text-xs font-medium text-ink-2">{items.length}</span>
              </div>
              <ul className="space-y-2 px-5 pb-5 pt-3">
                {items.length ? (
                  items.map((name) => {
                    const c = report.competencies.find((x) => x.name === name)
                    return (
                      <li key={name} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2.5 text-sm">
                        <span className="font-medium text-ink">{name}</span>
                        {c && <span className="tabular text-ink-3">{c.score}%</span>}
                      </li>
                    )
                  })
                ) : (
                  <li className="text-sm text-ink-3">{col.empty}</li>
                )}
              </ul>
            </Card>
          )
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Competency map" description="Estimated mastery per competency area (demo data)" />
          <CardBody>
            <CompetencyList competencies={[...report.competencies].sort((a, b) => a.score - b.score)} />
          </CardBody>
        </Card>

        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Evidence" description="Assessment items that informed this diagnosis" />
            <ul className="divide-y divide-line">
              {report.evidence.map((e, i) => {
                const o = OUTCOME[e.outcome]
                return (
                  <li key={i} className="flex items-start gap-3 px-5 py-3">
                    <o.icon className={cn('mt-0.5 size-4 shrink-0', o.tone === 'good' ? 'text-good' : o.tone === 'warn' ? 'text-warn' : 'text-bad')} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">{e.item}</p>
                      <p className="text-xs text-ink-3">{e.assessmentTitle}</p>
                    </div>
                    <StatusBadge tone={o.tone}>{o.label}</StatusBadge>
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card>
            <CardHeader
              title="Student feedback"
              description="Difficulty and confidence the student reported after practice — used as a signal in this diagnosis"
              icon={<MessageSquareText className="size-5" aria-hidden />}
            />
            <ul className="divide-y divide-line">
              {feedback.map((f) => (
                <li key={f.activity} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium text-ink">{f.activity}</p>
                    <span className="shrink-0 text-xs text-ink-3">{formatDate(f.date)}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <StatusBadge tone={LEVEL_TONE[f.level]}>{f.difficulty}</StatusBadge>
                    <StatusBadge tone="neutral">{f.confidence}</StatusBadge>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Next step" />
            <CardBody>
              {guidance ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink">Teaching guidance for {guidance.competencyGap}</p>
                    <GuidanceStatusBadge status={guidance.status} />
                  </div>
                  <p className="mt-1 text-sm text-ink-2">{guidance.teachingApproach.method}</p>
                  <p className="mt-1 text-xs text-ink-3">{guidance.curriculumReference}</p>
                  <ButtonLink to={`/guidance/${guidance.id}`} className="mt-4 w-full" icon={<Sparkles className="size-4" aria-hidden />}>
                    Open guidance review
                  </ButtonLink>
                </>
              ) : (
                <p className="text-sm text-ink-2">No area currently requires support, so no guidance plan has been prepared. Continue regular class practice.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <DemoNotice className="mt-6">
        This diagnostic report is sample data for UI review. No diagnostic algorithm runs in this prototype; the diagnostic engine will be connected later.
      </DemoNotice>
    </>
  )
}
