import { LevelBadge, StatusBadge } from '../../../components/ui/StatusBadge'
import { FRAMEWORK_LABEL } from '../../../data/curriculum'
import { getStudentAssessmentHistory } from '../../../data/assessments'
import { formatDate, formatSignedPoints } from '../../../lib/format'
import type { SchoolClass, Student } from '../../../types'
import { DocSection, DocStats, DocTable } from './ReportDocument'
import { inDateRange, type ReportFilters } from './types'

export function StudentReport({ student, cls, filters }: { student: Student; cls: SchoolClass; filters: ReportFilters }) {
  const bySubject = <T extends { subject: string }>(x: T) => filters.subject === 'all' || x.subject === filters.subject
  const competencies = student.competencies.filter(bySubject)
  const history = getStudentAssessmentHistory(student.id, cls.id).filter(
    (h) => bySubject(h.assessment) && inDateRange(h.assessment.date, filters.from, filters.to),
  )

  return (
    <>
      <p className="text-sm text-ink-2">
        <span className="font-medium text-ink">{student.name}</span> · {cls.name} · {FRAMEWORK_LABEL[student.framework]}
      </p>
      <DocStats
        items={[
          { label: 'Overall average', value: `${student.average}%`, hint: 'Recent assessments' },
          { label: 'Change vs last term', value: formatSignedPoints(student.trend) },
          { label: 'Status', value: student.needsSupport ? 'Needs support' : 'On track' },
          { label: 'Results in period', value: history.filter((h) => h.percent !== null).length },
        ]}
      />
      <DocSection title="Current learning focus">
        <p className="text-sm text-ink">{student.currentFocus}</p>
      </DocSection>
      <DocSection title="Competencies" description="Demo mastery estimates with competency level">
        <DocTable
          caption="Student competencies"
          rows={competencies}
          rowKey={(c) => c.competencyId}
          columns={[
            { header: 'Competency', cell: (c) => <span className="font-medium">{c.name}</span> },
            { header: 'Topic', cell: (c) => <span className="text-ink-2">{c.topic}</span> },
            { header: 'Subject', cell: (c) => <span className="text-ink-2">{c.subject}</span> },
            { header: 'Mastery', align: 'right', cell: (c) => `${c.score}%` },
            { header: 'Level', cell: (c) => <LevelBadge level={c.level} /> },
          ]}
        />
      </DocSection>
      <DocSection title="Recent assessments">
        <DocTable
          caption="Recent assessments"
          rows={history.slice(0, 8)}
          rowKey={(h) => h.assessment.id}
          columns={[
            { header: 'Date', cell: (h) => <span className="whitespace-nowrap">{formatDate(h.assessment.date)}</span> },
            { header: 'Assessment', cell: (h) => h.assessment.title },
            { header: 'Type', cell: (h) => <span className="text-ink-2">{h.assessment.type}</span> },
            {
              header: 'Result',
              align: 'right',
              cell: (h) => (h.percent === null ? <StatusBadge>Not recorded</StatusBadge> : `${h.percent}%`),
            },
          ]}
        />
      </DocSection>
    </>
  )
}
