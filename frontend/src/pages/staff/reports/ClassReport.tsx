import { BarList } from '../../../components/charts/BarList'
import { LineChart } from '../../../components/charts/LineChart'
import { toneForScore } from '../../../components/ui/ProgressBar'
import { getAssessmentsByClass } from '../../../data/assessments'
import { getClassCompetencyAverages } from '../../../data/classes'
import { FRAMEWORK_LABEL } from '../../../data/curriculum'
import { getClassTrend } from '../../../data/performance'
import { getStudentsByClass } from '../../../data/students'
import { LEVEL_LABEL, levelFromScore } from '../../../lib/competency'
import { formatDate, formatSignedPoints } from '../../../lib/format'
import type { SchoolClass } from '../../../types'
import { DocSection, DocStats, DocTable } from './ReportDocument'
import { inDateRange, type ReportFilters } from './types'

export function ClassReport({ cls, filters }: { cls: SchoolClass; filters: ReportFilters }) {
  const bySubject = (subject: string) => filters.subject === 'all' || subject === filters.subject
  const students = getStudentsByClass(cls.id)
  const needing = students.filter((s) => s.needsSupport).sort((a, b) => a.average - b.average)
  const trend = getClassTrend(cls.id)
  const competencies = getClassCompetencyAverages(cls.id).filter((c) => bySubject(c.subject))
  const gaps = cls.commonGaps.filter((g) => bySubject(g.subject))
  const assessments = getAssessmentsByClass(cls.id)
    .filter((a) => bySubject(a.subject) && inDateRange(a.date, filters.from, filters.to))
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <p className="text-sm text-ink-2">
        <span className="font-medium text-ink">{cls.name}</span> · {cls.level} · {FRAMEWORK_LABEL[cls.framework]}
      </p>
      <DocStats
        items={[
          { label: 'Students', value: students.length },
          { label: 'Class average', value: `${cls.average}%` },
          { label: 'Change vs last term', value: formatSignedPoints(cls.trend) },
          { label: 'Needing support', value: needing.length },
        ]}
      />
      <DocSection title="Class average trend" description="Class average across recent assessment periods (%)">
        <LineChart ariaLabel={`${cls.name} average trend`} series={[{ name: 'Class average', points: trend, color: 'var(--color-series-1)' }]} min={30} max={90} height={200} />
      </DocSection>
      <DocSection title="Competency averages" description="Average demo mastery per competency">
        {competencies.length ? (
          <BarList
            items={competencies.map((c) => ({
              id: c.id,
              label: c.name,
              meta: `${c.subject} · ${LEVEL_LABEL[levelFromScore(c.average)]}`,
              value: c.average,
              tone: toneForScore(c.average),
            }))}
          />
        ) : (
          <p className="text-sm text-ink-3">No competencies tracked for this subject.</p>
        )}
      </DocSection>
      <DocSection title="Common competency gaps">
        <DocTable
          caption="Common competency gaps"
          rows={gaps}
          rowKey={(g) => g.competency}
          columns={[
            { header: 'Competency', cell: (g) => <span className="font-medium">{g.competency}</span> },
            { header: 'Subject', cell: (g) => <span className="text-ink-2">{g.subject}</span> },
            { header: 'Students needing support', align: 'right', cell: (g) => g.studentsAffected },
          ]}
        />
      </DocSection>
      <DocSection title="Students needing support" description={`${needing.length} of ${students.length} students`}>
        <DocTable
          caption="Students needing support"
          rows={needing}
          rowKey={(s) => s.id}
          columns={[
            { header: 'Student', cell: (s) => <span className="font-medium">{s.name}</span> },
            { header: 'Current focus', cell: (s) => <span className="text-ink-2">{s.currentFocus}</span> },
            { header: 'Average', align: 'right', cell: (s) => `${s.average}%` },
          ]}
        />
      </DocSection>
      <DocSection title="Assessments in period">
        <DocTable
          caption="Assessments in period"
          rows={assessments}
          rowKey={(a) => a.id}
          columns={[
            { header: 'Date', cell: (a) => <span className="whitespace-nowrap">{formatDate(a.date)}</span> },
            { header: 'Assessment', cell: (a) => a.title },
            { header: 'Type', cell: (a) => <span className="text-ink-2">{a.type}</span> },
            { header: 'Class average', align: 'right', cell: (a) => (a.average !== undefined ? `${a.average}%` : '—') },
          ]}
        />
      </DocSection>
    </>
  )
}
