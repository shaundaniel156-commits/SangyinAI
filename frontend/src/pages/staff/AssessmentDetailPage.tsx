import { CalendarDays, ClipboardList, FileUp, Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChartContainer } from '../../components/charts/ChartContainer'
import { ColumnChart } from '../../components/charts/ColumnChart'
import { AssessmentStatusBadge } from '../../components/domain/AssessmentCard'
import { Avatar } from '../../components/ui/Avatar'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { DemoNotice } from '../../components/ui/DemoNotice'
import { EmptyState } from '../../components/ui/EmptyState'
import { inputClasses } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { LevelBadge, StatusBadge } from '../../components/ui/StatusBadge'
import { Tabs } from '../../components/ui/Tabs'
import { useToast } from '../../context/ToastContext'
import { getAssessment, getAssessmentResults } from '../../data/assessments'
import { getClass } from '../../data/classes'
import { getStudent } from '../../data/students'
import { levelFromScore } from '../../lib/competency'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import type { Assessment } from '../../types'

export function AssessmentDetailPage() {
  const { id = '' } = useParams()
  const assessment = getAssessment(id)
  const [tab, setTab] = useState<'results' | 'entry'>(assessment?.status === 'awaiting_scores' ? 'entry' : 'results')

  if (!assessment) {
    return (
      <Card>
        <EmptyState icon={ClipboardList} title="Assessment not found" action={<ButtonLink to="/assessments">Back to assessments</ButtonLink>} />
      </Card>
    )
  }

  const cls = getClass(assessment.classId)
  const results = getAssessmentResults(assessment)
  const scored = results.filter((r) => r.score !== null).map((r) => Math.round(((r.score as number) / assessment.maxScore) * 100))
  const bands = [
    { label: '0–29%', value: scored.filter((p) => p < 30).length },
    { label: '30–49%', value: scored.filter((p) => p >= 30 && p < 50).length },
    { label: '50–69%', value: scored.filter((p) => p >= 50 && p < 70).length },
    { label: '70–84%', value: scored.filter((p) => p >= 70 && p < 85).length },
    { label: '85–100%', value: scored.filter((p) => p >= 85).length },
  ]

  return (
    <>
      <PageHeader
        back={{ to: '/assessments', label: 'Assessments' }}
        title={assessment.title}
        description={`${cls?.name} · ${assessment.subject} · Max score ${assessment.maxScore}`}
        meta={
          <>
            <AssessmentStatusBadge status={assessment.status} />
            <StatusBadge>{assessment.type}</StatusBadge>
            <StatusBadge icon={CalendarDays}>{formatDate(assessment.date)}</StatusBadge>
            {assessment.topics.map((t) => (
              <StatusBadge key={t} tone="info">
                {t}
              </StatusBadge>
            ))}
          </>
        }
        actions={
          <ButtonLink to="/assessments/import" variant="secondary" icon={<FileUp className="size-4" aria-hidden />}>
            Import results
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        <Metric label="Class average" value={assessment.average !== undefined ? `${assessment.average}%` : '—'} />
        <Metric label="Highest" value={scored.length ? `${Math.max(...scored)}%` : '—'} />
        <Metric label="Lowest" value={scored.length ? `${Math.min(...scored)}%` : '—'} />
        <Metric label="Scores entered" value={`${assessment.scoresEntered} / ${results.length}`} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="px-4 pt-2">
            <Tabs
              label="Assessment views"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: 'results', label: 'Student results' },
                { id: 'entry', label: 'Score entry' },
              ]}
            />
          </div>
          {tab === 'results' ? <ResultsTable assessment={assessment} /> : <ScoreEntry assessment={assessment} />}
        </Card>
        <ChartContainer
          title="Result distribution"
          description="Number of students per score band"
          table={{ headers: ['Score band', 'Students'], rows: bands.map((b) => [b.label, b.value]) }}
        >
          {scored.length ? (
            <ColumnChart data={bands} ariaLabel="Distribution of student scores" height={200} />
          ) : (
            <EmptyState icon={ClipboardList} title="No scores yet" description="Enter or import scores to see the distribution." />
          )}
        </ChartContainer>
      </div>
    </>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-glow rounded-xl border border-line bg-surface p-4">
      <p className="text-sm text-ink-3">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold text-ink">{value}</p>
    </div>
  )
}

function ResultsTable({ assessment }: { assessment: Assessment }) {
  const results = getAssessmentResults(assessment)
  return (
    <DataTable
      caption="Student results"
      rows={results}
      rowKey={(r) => r.studentId}
      pageSize={10}
      columns={[
        {
          id: 'student',
          header: 'Student',
          cell: (r) => {
            const s = getStudent(r.studentId)
            return (
              <Link to={`/students/${r.studentId}`} className="flex items-center gap-3 hover:underline">
                <Avatar initials={s?.initials ?? ''} size="sm" />
                <span className="font-medium">{s?.name}</span>
              </Link>
            )
          },
        },
        {
          id: 'score',
          header: 'Score',
          align: 'right',
          cell: (r) => (r.score === null ? <span className="text-ink-3">Not entered</span> : <span className="tabular">{r.score} / {assessment.maxScore}</span>),
        },
        {
          id: 'pct',
          header: '%',
          align: 'right',
          hideBelow: 'sm',
          cell: (r) => (r.score === null ? '—' : <span className="tabular font-medium">{Math.round((r.score / assessment.maxScore) * 100)}%</span>),
        },
        {
          id: 'level',
          header: 'Level',
          hideBelow: 'md',
          cell: (r) => (r.score === null ? null : <LevelBadge level={levelFromScore((r.score / assessment.maxScore) * 100)} />),
        },
      ]}
    />
  )
}

function ScoreEntry({ assessment }: { assessment: Assessment }) {
  const { notify } = useToast()
  const initial = useMemo(() => getAssessmentResults(assessment), [assessment])
  const [scores, setScores] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.map((r) => [r.studentId, r.score === null ? '' : String(r.score)])),
  )
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  const invalid = Object.values(scores).filter((v) => v !== '' && (Number(v) < 0 || Number(v) > assessment.maxScore || Number.isNaN(Number(v)))).length
  const entered = Object.values(scores).filter((v) => v !== '').length

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-line px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-2">
          <span className="tabular font-medium text-ink">{entered}</span> of {initial.length} scores entered · max {assessment.maxScore}
          {invalid > 0 && <span className="ml-2 font-medium text-bad-ink">{invalid} out of range</span>}
        </p>
        <Button
          size="sm"
          icon={<Save className="size-4" aria-hidden />}
          disabled={invalid > 0}
          onClick={() => notify('Scores saved for preview', { description: 'Not stored — score saving will be connected to the backend later.' })}
        >
          Save scores
        </Button>
      </div>
      <div className="max-h-[560px] overflow-y-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Score entry</caption>
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr className="border-b border-line">
              <th scope="col" className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-3">Student</th>
              <th scope="col" className="w-32 px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-3">Score</th>
              <th scope="col" className="hidden px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-3 md:table-cell">Remark (optional)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {initial.map((r) => {
              const s = getStudent(r.studentId)
              const v = scores[r.studentId] ?? ''
              const bad = v !== '' && (Number(v) < 0 || Number(v) > assessment.maxScore || Number.isNaN(Number(v)))
              return (
                <tr key={r.studentId}>
                  <td className="px-4 py-2">
                    <label htmlFor={`score-${r.studentId}`} className="font-medium text-ink">
                      {s?.name}
                    </label>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        id={`score-${r.studentId}`}
                        inputMode="numeric"
                        value={v}
                        onChange={(e) => setScores((x) => ({ ...x, [r.studentId]: e.target.value }))}
                        aria-invalid={bad}
                        className={cn(inputClasses, 'tabular h-9 w-20', bad && 'border-bad focus:border-bad focus:ring-bad/20')}
                      />
                      <span className="whitespace-nowrap text-ink-3">/ {assessment.maxScore}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-2 md:table-cell">
                    <input
                      aria-label={`Remark for ${s?.name}`}
                      value={remarks[r.studentId] ?? ''}
                      onChange={(e) => setRemarks((x) => ({ ...x, [r.studentId]: e.target.value }))}
                      placeholder="e.g. absent, observed strategy…"
                      className={cn(inputClasses, 'h-9')}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="p-4">
        <DemoNotice>Prototype — scores entered here are kept only on this screen and are not saved.</DemoNotice>
      </div>
    </div>
  )
}
