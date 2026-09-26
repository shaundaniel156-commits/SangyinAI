/**
 * DEMO DATA — difficulty and confidence the student reported after practice
 * (the "collaboration with students" loop). Derived from the demo mastery level
 * so it stays consistent with each diagnostic report.
 */
import type { CompetencyLevel, Student, Subject } from '../types'
import { PRACTICE_ACTIVITIES } from './practice'

export interface FeedbackSignal {
  activity: string
  competency: string
  difficulty: 'Easy' | 'Okay' | 'Difficult'
  confidence: 'I feel confident' | 'A little unsure' | 'I need more help'
  level: CompetencyLevel
  date: string
}

const BY_LEVEL: Record<CompetencyLevel, Pick<FeedbackSignal, 'difficulty' | 'confidence'>> = {
  strength: { difficulty: 'Easy', confidence: 'I feel confident' },
  developing: { difficulty: 'Okay', confidence: 'A little unsure' },
  needs_support: { difficulty: 'Difficult', confidence: 'I need more help' },
}

const DATES = ['2026-09-23', '2026-09-19', '2026-09-15']

/** Up to three recent self-reports for the student's weakest competencies in a subject. */
export function getStudentFeedbackSignals(student: Student, subject: Subject): FeedbackSignal[] {
  return student.competencies
    .filter((c) => c.subject === subject)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((c, i) => ({
      activity: PRACTICE_ACTIVITIES.find((a) => a.focus === c.name)?.title ?? `${c.name} practice`,
      competency: c.name,
      level: c.level,
      date: DATES[i]!,
      ...BY_LEVEL[c.level],
    }))
}
