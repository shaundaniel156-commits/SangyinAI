import type { CompetencyLevel } from '../types'

/**
 * Display thresholds that bucket mastery scores (0–100) into levels: 70+ strength, 50–69 developing,
 * below 50 needs support.
 */
export const LEVEL_THRESHOLDS = { strength: 70, developing: 50 } as const

export function levelFromScore(score: number): CompetencyLevel {
  if (score >= LEVEL_THRESHOLDS.strength) return 'strength'
  if (score >= LEVEL_THRESHOLDS.developing) return 'developing'
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
