import { BarList } from '../../../components/charts/BarList'
import { toneForScore } from '../../../components/ui/ProgressBar'
import { FRAMEWORK_LABEL } from '../../../data/curriculum'
import { SUBJECT_AVERAGES } from '../../../data/performance'
import { formatSignedPoints } from '../../../lib/format'
import type { Assessment, SchoolClass } from '../../../types'
import { DocSection, DocStats, DocTable } from './ReportDocument'
import { inDateRange, type ReportFilters } from './types'

interface SubjectReportProps {
  classes: SchoolClass[]
  assessments: Assessment[]
  filters: ReportFilters
}

export function SubjectPerformanceReport({ classes, assessments, filters }: SubjectReportProps) {
  const recorded = assessments.filter((a) => a.average !== undefined && inDateRange(a.date, filters.from, filters.to))
  const bySubject = SUBJECT_AVERAGES.map(({ subject, value }) => {
    const items = recorded.filter((a) => a.subject === subject)
    const mean = items.length ? Math.round(items.reduce((s, a) => s + (a.average ?? 0), 0) / items.length) : null
    return { subject, schoolAverage: value, count: items.length, mean }
  })
  const best = [...SUBJECT_AVERAGES].sort((a, b) => b.value - a.value)[0]
  const lowest = [...SUBJECT_AVERAGES].sort((a, b) => a.value - b.value)[0]
  const pupils = classes.reduce((n, c) => n + c.studentCount, 0)
  const meanClass = Math.round(classes.reduce((s, c) => s + c.average * c.studentCount, 0) / Math.max(pupils, 1))

  return (
    <>
      <DocStats
        items={[
          { label: 'Classes in report', value: classes.length },
          { label: 'Average across classes', value: `${meanClass}%`, hint: 'Weighted by class size' },
          { label: 'Highest subject', value: best ? `${best.value}%` : '—', hint: best?.subject },
          { label: 'Lowest subject', value: lowest ? `${lowest.value}%` : '—', hint: lowest?.subject },
        ]}
      />
      <DocSection title="Subject averages" description="School-wide demo averages for the current term (%)">
        <BarList items={SUBJECT_AVERAGES.map((s) => ({ id: s.subject, label: s.subject, value: s.value, tone: toneForScore(s.value) }))} />
      </DocSection>
      <DocSection title="Recorded assessments by subject" description="Classes in scope, within the selected date range">
        <DocTable
          caption="Recorded assessments by subject"
          rows={bySubject}
          rowKey={(r) => r.subject}
          columns={[
            { header: 'Subject', cell: (r) => <span className="font-medium">{r.subject}</span> },
            { header: 'School average', align: 'right', cell: (r) => `${r.schoolAverage}%` },
            { header: 'Assessments recorded', align: 'right', cell: (r) => r.count },
            { header: 'Mean assessment average', align: 'right', cell: (r) => (r.mean === null ? '—' : `${r.mean}%`) },
          ]}
        />
      </DocSection>
      <DocSection title="Class averages">
        <DocTable
          caption="Class averages"
          rows={[...classes].sort((a, b) => b.average - a.average)}
          rowKey={(c) => c.id}
          columns={[
            { header: 'Class', cell: (c) => <span className="font-medium">{c.name}</span> },
            { header: 'Framework', cell: (c) => <span className="text-ink-2">{FRAMEWORK_LABEL[c.framework]}</span> },
            { header: 'Students', align: 'right', cell: (c) => c.studentCount },
            { header: 'Average', align: 'right', cell: (c) => `${c.average}%` },
            { header: 'Change', align: 'right', cell: (c) => formatSignedPoints(c.trend) },
          ]}
        />
      </DocSection>
    </>
  )
}
