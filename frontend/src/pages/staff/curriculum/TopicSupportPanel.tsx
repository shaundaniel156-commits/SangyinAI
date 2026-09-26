import { GitBranch, LifeBuoy } from 'lucide-react'
import { TOPIC_PREREQUISITES } from '../../../data/prerequisites'
import { Card, CardBody, CardHeader } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { CurriculumTopic, Student } from '../../../types'

interface TopicSupportPanelProps {
  topics: CurriculumTopic[]
  /** In-scope students already filtered to the selected framework and subject. */
  students: Student[]
}

/**
 * For each topic in the selected subject, counts in-scope students whose demo
 * competency of the same name is currently at "Needs support". Only exact name
 * matches are shown — no inferred mapping.
 */
export function TopicSupportPanel({ topics, students }: TopicSupportPanelProps) {
  const rows = topics
    .map((t) => ({
      topic: t.name,
      tracked: students.some((s) => s.competencies.some((c) => c.name === t.name)),
      count: students.filter((s) => s.competencies.some((c) => c.name === t.name && c.level === 'needs_support')).length,
    }))
    .filter((r) => r.tracked)

  return (
    <Card>
      <CardHeader
        icon={<LifeBuoy className="size-5" aria-hidden />}
        title="Support needs by topic"
        description="Students in your scope needing support in a matching competency"
      />
      <CardBody>
        {rows.length === 0 ? (
          <p className="text-sm text-ink-3">No tracked demo competencies match topics at this level for students in your scope.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.topic} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <span className="text-ink">{r.topic}</span>
                <StatusBadge tone={r.count > 0 ? 'bad' : 'good'} className="tabular">
                  {r.count} {r.count === 1 ? 'student' : 'students'}
                </StatusBadge>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-ink-3">
          Based on demo mastery estimates for {students.length} students on this framework. Matched by competency name only.
        </p>
      </CardBody>
    </Card>
  )
}

/** Which earlier topics each topic builds on — used to trace a gap back to its foundations. */
export function PrerequisitesPanel({ topics }: { topics: CurriculumTopic[] }) {
  const rows = topics.filter((t) => TOPIC_PREREQUISITES[t.name]?.length)
  if (rows.length === 0) return null
  return (
    <Card>
      <CardHeader
        icon={<GitBranch className="size-5" aria-hidden />}
        title="Prerequisites"
        description="What each topic builds on — a gap here may start in an earlier topic"
      />
      <CardBody>
        <ul className="space-y-3">
          {rows.map((t) => (
            <li key={t.id} className="text-sm">
              <p className="font-medium text-ink">{t.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-ink-3">Builds on</span>
                {TOPIC_PREREQUISITES[t.name]!.map((p) => (
                  <StatusBadge key={p} tone="info">
                    {p}
                  </StatusBadge>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-3">Illustrative demo links, not the reviewed curriculum graph.</p>
      </CardBody>
    </Card>
  )
}
