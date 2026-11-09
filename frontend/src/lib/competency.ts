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

/** Shown in place of a figure for a learner or class with nothing assessed yet, which is not the same as 0%. */
export const NO_RESULTS = 'No results yet'

/** True once anything has been recorded about the learner's mastery. */
export function hasResults(student: { competencies: unknown[] }): boolean {
  return student.competencies.length > 0
}

/** The learner's average as "62%", or "No results yet". */
export function averageLabel(student: { average: number; competencies: unknown[] }): string {
  return hasResults(student) ? `${student.average}%` : NO_RESULTS
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
