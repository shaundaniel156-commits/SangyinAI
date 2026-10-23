/** Classes, loaded from the backend after sign-in (lib/liveData.ts fills the list in place). */
import type { SchoolClass } from '../types'
import { COMPETENCIES, getStudentsByClass } from './students'

export const CLASSES: SchoolClass[] = []

export function getClass(id: string): SchoolClass | undefined {
  return CLASSES.find((c) => c.id === id)
}

export function getClassesForTeacher(teacherId: string): SchoolClass[] {
  return CLASSES.filter((c) => c.teacherId === teacherId)
}

/** Average mastery per competency for a class (0–100). */
export function getClassCompetencyAverages(classId: string) {
  const students = getStudentsByClass(classId)
  return COMPETENCIES.map((c) => {
    const scores = students.map((s) => s.competencies.find((sc) => sc.competencyId === c.id)?.score ?? 0)
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / Math.max(scores.length, 1))
    return { ...c, average: avg }
  })
}
