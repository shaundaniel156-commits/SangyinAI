import { ChevronDown, ChevronRight, Target } from 'lucide-react'
import { useId } from 'react'
import { cn } from '../../../lib/cn'
import type { CurriculumCompetency, CurriculumTopic } from '../../../types'

interface CurriculumTreeProps {
  topics: CurriculumTopic[]
  expanded: Set<string>
  onToggle: (topicId: string) => void
}

/** Expandable tree: Topic → Competency → Learning objective (with demo codes). */
export function CurriculumTree({ topics, expanded, onToggle }: CurriculumTreeProps) {
  return (
    <ul className="divide-y divide-line">
      {topics.map((t) => (
        <TopicNode key={t.id} topic={t} open={expanded.has(t.id)} onToggle={() => onToggle(t.id)} />
      ))}
    </ul>
  )
}

function TopicNode({ topic, open, onToggle }: { topic: CurriculumTopic; open: boolean; onToggle: () => void }) {
  const panelId = useId()
  const objectiveCount = topic.competencies.reduce((n, c) => n + c.objectives.length, 0)
  const Icon = open ? ChevronDown : ChevronRight
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-2"
      >
        <Icon className="size-4 shrink-0 text-ink-3" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-ink-3">Topic</span>
          <span className="block font-medium text-ink">{topic.name}</span>
        </span>
        <span className="tabular shrink-0 text-xs text-ink-3">
          {topic.competencies.length} {topic.competencies.length === 1 ? 'competency' : 'competencies'} · {objectiveCount}{' '}
          {objectiveCount === 1 ? 'objective' : 'objectives'}
        </span>
      </button>
      {open && (
        <ul id={panelId} className="space-y-3 px-5 pb-4 sm:pl-12">
          {topic.competencies.map((c) => (
            <CompetencyNode key={c.id} competency={c} />
          ))}
        </ul>
      )}
    </li>
  )
}

function CompetencyNode({ competency }: { competency: CurriculumCompetency }) {
  return (
    <li className="rounded-lg border border-line bg-surface-2 p-3.5">
      <div className="flex items-start gap-2.5">
        <Target className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden />
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">Competency</p>
          <p className="text-sm font-medium text-ink">{competency.name}</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-ink-3">Learning objectives</p>
      <ul className="mt-1.5 space-y-1.5">
        {competency.objectives.map((o) => (
          <li key={o.id} className={cn('flex flex-col gap-1 rounded-md bg-surface px-3 py-2 text-sm sm:flex-row sm:items-baseline sm:gap-3')}>
            <code className="shrink-0 rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs text-ink-2">{o.code}</code>
            <span className="text-ink">{o.text}</span>
          </li>
        ))}
      </ul>
    </li>
  )
}
