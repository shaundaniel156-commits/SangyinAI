// The standard class names for a school's level and curriculum, offered when assigning a teacher to a class.
// Keep in step with frontend/src/lib/classLevels.ts.

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
