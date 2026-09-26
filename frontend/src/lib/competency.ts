import type { CompetencyLevel } from '../types'

/**
 * DEMO display thresholds used to bucket mock mastery scores into levels.
 * The real diagnostic engine will supply levels directly; these thresholds exist
 * only so the prototype can render consistent mock data.
 */
export const DEMO_LEVEL_THRESHOLDS = { strength: 70, developing: 50 } as const

export function levelFromScore(score: number): CompetencyLevel {
  if (score >= DEMO_LEVEL_THRESHOLDS.strength) return 'strength'
  if (score >= DEMO_LEVEL_THRESHOLDS.developing) return 'developing'
  return 'needs_support'
}

/** Labels for staff-facing screens. */
export const LEVEL_LABEL: Record<CompetencyLevel, string> = {
  strength: 'Strength',
  developing: 'Developing',
  needs_support: 'Needs support',
}

/** Plain-language labels for parent- and student-facing screens. */
export const LEVEL_LABEL_FRIENDLY: Record<CompetencyLevel, string> = {
  strength: 'Doing well',
  developing: 'Getting there',
  needs_support: 'Needs more practice',
}
