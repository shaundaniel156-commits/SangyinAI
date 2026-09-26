import { LevelBadge } from '../../../components/ui/StatusBadge'
import { getClassCompetencyAverages } from '../../../data/classes'
import { DEMO_COMPETENCIES, getStudentsByClass } from '../../../data/students'
import { levelFromScore } from '../../../lib/competency'
import type { SchoolClass } from '../../../types'
import { DocSection, DocStats, DocTable, type DocColumn } from './ReportDocument'
import type { ReportFilters } from './types'

interface Row {
  id: string
  name: string
  subject: string
  perClass: Record<string, number>
  overall: number
  needing: number
}

export function CompetencyReport({ classes, filters }: { classes: SchoolClass[]; filters: ReportFilters }) {
  const averages = new Map(classes.map((c) => [c.id, getClassCompetencyAverages(c.id)]))
  const students = classes.flatMap((c) => getStudentsByClass(c.id))
  const pupils = classes.reduce((n, c) => n + c.studentCount, 0)

  const rows: Row[] = DEMO_COMPETENCIES.filter((c) => filters.subject === 'all' || c.subject === filters.subject).map((comp) => {
    const perClass: Record<string, number> = {}
    let weighted = 0
    for (const c of classes) {
      const avg = averages.get(c.id)?.find((a) => a.id === comp.id)?.average ?? 0
      perClass[c.id] = avg
      weighted += avg * c.studentCount
    }
    return {
      id: comp.id,
      name: comp.name,
      subject: comp.subject,
      perClass,
      overall: Math.round(weighted / Math.max(pupils, 1)),
      needing: students.filter((s) => s.competencies.some((sc) => sc.competencyId === comp.id && sc.level === 'needs_support')).length,
    }
  })

  const count = (level: ReturnType<typeof levelFromScore>) => rows.filter((r) => levelFromScore(r.overall) === level).length

  const columns: DocColumn<Row>[] = [
    {
      header: 'Competency',
      cell: (r) => (
        <>
          <span className="font-medium">{r.name}</span>
          <span className="block text-xs text-ink-3">{r.subject}</span>
        </>
      ),
    },
    ...(classes.length > 1
      ? classes.map((c) => ({ header: c.name.replace(' (Sample Class)', ''), align: 'right' as const, cell: (r: Row) => `${r.perClass[c.id]}%` }))
      : []),
    { header: classes.length > 1 ? 'Overall' : 'Average', align: 'right', cell: (r) => <span className="font-medium">{r.overall}%</span> },
    { header: 'Level', cell: (r) => <LevelBadge level={levelFromScore(r.overall)} /> },
    { header: 'Needing support', align: 'right', cell: (r) => r.needing },
  ]

  return (
    <>
      <p className="text-sm text-ink-2">
        {classes.length === 1 ? classes[0]!.name : `${classes.length} classes`} · {pupils} students ·{' '}
        {filters.subject === 'all' ? 'All subjects' : filters.subject}
      </p>
      <DocStats
        items={[
          { label: 'Competencies', value: rows.length },
          { label: 'Strength', value: count('strength') },
          { label: 'Developing', value: count('developing') },
          { label: 'Needs support', value: count('needs_support') },
        ]}
      />
      <DocSection
        title="Competency averages across classes"
        description="Average demo mastery (%). Overall is weighted by class size; level uses demo display thresholds."
      >
        <DocTable caption="Competency averages across classes" rows={rows} rowKey={(r) => r.id} columns={columns} />
      </DocSection>
    </>
  )
}
