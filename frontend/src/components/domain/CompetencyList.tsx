import type { CompetencyScore } from '../../types'
import { ProgressBar, toneForScore } from '../ui/ProgressBar'
import { LevelBadge } from '../ui/StatusBadge'

interface CompetencyListProps {
  competencies: CompetencyScore[]
  /** Use plain-language labels (parent/student views). */
  friendly?: boolean
  showScore?: boolean
}

/** Competency rows with a mastery bar and a level badge (colour + icon + text). */
export function CompetencyList({ competencies, friendly = false, showScore = true }: CompetencyListProps) {
  return (
    <ul className="space-y-4">
      {competencies.map((c) => (
        <li key={c.competencyId}>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{c.name}</p>
              {!friendly && <p className="truncate text-xs text-ink-3">{c.topic}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {showScore && <span className="tabular text-sm text-ink-2">{c.score}%</span>}
              <LevelBadge level={c.level} friendly={friendly} />
            </div>
          </div>
          <ProgressBar value={c.score} tone={toneForScore(c.score)} size="sm" srLabel={`${c.name} mastery`} />
        </li>
      ))}
    </ul>
  )
}
