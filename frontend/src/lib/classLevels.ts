// The standard class names for a school's level and curriculum, offered when assigning a teacher to a class.
// Keep in step with backend/src/feed/classLevels.ts.

const range = (prefix: string, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `${prefix} ${from + i}`)

const LEVELS = {
  uganda: { primary: range('Primary', 1, 7), secondary: range('Senior', 1, 6) },
  cambridge: { primary: range('Grade', 1, 6), secondary: range('Grade', 7, 12) },
}

export function classLevels(type: string, framework: string): string[] {
  const set = framework === 'cambridge' ? LEVELS.cambridge : LEVELS.uganda
  if (type === 'primary') return set.primary
  if (type === 'secondary') return set.secondary
  if (type === 'mixed') return [...set.primary, ...set.secondary]
  return []
}

/** The school level and curriculum chosen on the "Your school" step before signing in. */
export interface SchoolSetup {
  type: 'primary' | 'secondary'
  framework: 'uganda' | 'cambridge'
}

export const SCHOOL_TYPE_LABEL: Record<SchoolSetup['type'], string> = { primary: 'Primary school', secondary: 'Secondary school' }
export const CURRICULUM_LABEL: Record<SchoolSetup['framework'], string> = { uganda: 'National curriculum', cambridge: 'Cambridge curriculum' }
