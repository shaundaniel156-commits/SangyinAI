/** Classes, loaded from the backend after sign-in (lib/liveData.ts fills the list in place). */
import { NO_RESULTS, hasResults } from '../lib/competency'
import type { SchoolClass } from '../types'
import { COMPETENCIES, getStudentsByClass } from './students'

export const CLASSES: SchoolClass[] = []

export function getClass(id: string): SchoolClass | undefined {
  return CLASSES.find((c) => c.id === id)
}

export function getClassesForTeacher(teacherId: string): SchoolClass[] {
  return CLASSES.filter((c) => c.teacherId === teacherId)
}

/** True when at least one learner in the class has results, so the class has an average. */
export function classHasResults(classId: string): boolean {
  return getStudentsByClass(classId).some(hasResults)
}

/** The class average as "62%", or "No results yet". */
export function classAverageLabel(cls: SchoolClass): string {
  return classHasResults(cls.id) ? `${cls.average}%` : NO_RESULTS
}

/**
 * Average mastery per competency for a class (0–100), over the learners who have a result in it. Learners with
 * no result are left out, and so is a competency nobody in the class has a result in.
 */
export function getClassCompetencyAverages(classId: string) {
  const students = getStudentsByClass(classId)
  return COMPETENCIES.flatMap((c) => {
    const scores = students.flatMap((s) => s.competencies.find((sc) => sc.competencyId === c.id)?.score ?? [])
    if (!scores.length) return []
    return [{ ...c, average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }]
  })
}
