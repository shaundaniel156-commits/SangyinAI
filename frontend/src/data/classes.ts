/**
 * DEMO DATA — sample classes. Summary figures are derived from the generated
 * demo students so every screen stays internally consistent.
 */
import type { CurriculumFramework, SchoolClass, Subject } from '../types'
import { DEMO_COMPETENCIES, getStudentsByClass } from './students'

interface ClassSeed {
  id: string
  name: string
  level: string
  framework: CurriculumFramework
  teacherId: string
  subjects: Subject[]
  trend: number
}

const CLASS_SEEDS: ClassSeed[] = [
  { id: 'c-p6a', name: 'P6 A (Sample Class)', level: 'Primary 6', framework: 'uganda', teacherId: 't-01', subjects: ['Mathematics', 'English', 'Science', 'Social Studies'], trend: 4 },
  { id: 'c-p7a', name: 'P7 A (Sample Class)', level: 'Primary 7', framework: 'uganda', teacherId: 't-01', subjects: ['Mathematics', 'English', 'Science', 'Social Studies'], trend: 2 },
  { id: 'c-s1b', name: 'S1 B (Sample Class)', level: 'Senior 1 · Lower Secondary', framework: 'uganda', teacherId: 't-01', subjects: ['Mathematics', 'English', 'Science'], trend: -2 },
  { id: 'c-st7', name: 'Stage 7 (Sample Class)', level: 'Lower Secondary · Stage 7', framework: 'cambridge', teacherId: 't-02', subjects: ['Mathematics', 'English', 'Science'], trend: 3 },
]

function summarise(seed: ClassSeed): SchoolClass {
  const students = getStudentsByClass(seed.id)
  const average = Math.round(students.reduce((s, st) => s + st.average, 0) / Math.max(students.length, 1))
  const commonGaps = DEMO_COMPETENCIES.map((c) => ({
    competency: c.name,
    subject: c.subject,
    studentsAffected: students.filter((s) =>
      s.competencies.some((sc) => sc.competencyId === c.id && sc.level === 'needs_support'),
    ).length,
  }))
    .filter((g) => g.studentsAffected > 0)
    .sort((a, b) => b.studentsAffected - a.studentsAffected)
    .slice(0, 4)
  return { ...seed, studentCount: students.length, average, commonGaps }
}

export const CLASSES: SchoolClass[] = CLASS_SEEDS.map(summarise)

export function getClass(id: string): SchoolClass | undefined {
  return CLASSES.find((c) => c.id === id)
}

export function getClassesForTeacher(teacherId: string): SchoolClass[] {
  return CLASSES.filter((c) => c.teacherId === teacherId)
}

/** Average mastery per demo competency for a class (0–100). */
export function getClassCompetencyAverages(classId: string) {
  const students = getStudentsByClass(classId)
  return DEMO_COMPETENCIES.map((c) => {
    const scores = students.map((s) => s.competencies.find((sc) => sc.competencyId === c.id)?.score ?? 0)
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / Math.max(scores.length, 1))
    return { ...c, average: avg }
  })
}
