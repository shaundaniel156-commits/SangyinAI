/**
 * DEMO DATA — example assessments and generated results.
 * Titles are prefixed "Example" to make clear they are placeholders.
 */
import { createRandom } from '../lib/random'
import type { Assessment, AssessmentResult } from '../types'
import { getStudentsByClass } from './students'

const ASSESSMENT_SEEDS: Assessment[] = [
  { id: 'as-01', title: 'Example Quiz — Ratio and Proportion', type: 'Quiz', subject: 'Mathematics', classId: 'c-p6a', date: '2026-09-22', maxScore: 20, status: 'completed', topics: ['Ratio and Proportion'], scoresEntered: 38 },
  { id: 'as-02', title: 'Example Test — Fractions & Decimals', type: 'Test', subject: 'Mathematics', classId: 'c-p6a', date: '2026-09-15', maxScore: 50, status: 'completed', topics: ['Fractions', 'Decimals'], scoresEntered: 38 },
  { id: 'as-03', title: 'Example Assignment — Percentages in Daily Life', type: 'Assignment', subject: 'Mathematics', classId: 'c-p6a', date: '2026-09-23', maxScore: 30, status: 'awaiting_scores', topics: ['Percentages'], scoresEntered: 12 },
  { id: 'as-04', title: 'Example Observation — Group Problem Solving', type: 'Teacher Observation', subject: 'Mathematics', classId: 'c-p6a', date: '2026-09-18', maxScore: 10, status: 'completed', topics: ['Ratio and Proportion', 'Whole Numbers'], scoresEntered: 38 },
  { id: 'as-05', title: 'Example Test — Whole Numbers', type: 'Test', subject: 'Mathematics', classId: 'c-p7a', date: '2026-09-19', maxScore: 50, status: 'completed', topics: ['Whole Numbers'], scoresEntered: 35 },
  { id: 'as-06', title: 'Example Quiz — Percentages', type: 'Quiz', subject: 'Mathematics', classId: 'c-p7a', date: '2026-09-24', maxScore: 20, status: 'completed', topics: ['Percentages'], scoresEntered: 35 },
  { id: 'as-07', title: 'Example Test — Measurement', type: 'Test', subject: 'Mathematics', classId: 'c-s1b', date: '2026-09-17', maxScore: 60, status: 'completed', topics: ['Measurement'], scoresEntered: 32 },
  { id: 'as-08', title: 'Example Quiz — Ratio and Proportion', type: 'Quiz', subject: 'Mathematics', classId: 'c-s1b', date: '2026-10-02', maxScore: 20, status: 'scheduled', topics: ['Ratio and Proportion'], scoresEntered: 0 },
  { id: 'as-09', title: 'Example Test — Number and Proportion', type: 'Test', subject: 'Mathematics', classId: 'c-st7', date: '2026-09-21', maxScore: 40, status: 'completed', topics: ['Fractions', 'Ratio and Proportion'], scoresEntered: 26 },
  { id: 'as-10', title: 'Example Assessment — End of Term Revision', type: 'Test', subject: 'Mathematics', classId: 'c-p6a', date: '2026-10-09', maxScore: 100, status: 'draft', topics: ['Whole Numbers', 'Fractions', 'Percentages', 'Ratio and Proportion'], scoresEntered: 0 },
]

/** Assessments with class averages derived from the generated demo results. */
export const ASSESSMENTS: Assessment[] = ASSESSMENT_SEEDS.map((a) => {
  const scores = getAssessmentResults(a)
    .map((r) => r.score)
    .filter((v): v is number => v !== null)
  if (!scores.length) return a
  const average = Math.round((scores.reduce((x, y) => x + y, 0) / scores.length / a.maxScore) * 100)
  return { ...a, average }
})

export function getAssessment(id: string): Assessment | undefined {
  return ASSESSMENTS.find((a) => a.id === id)
}

export function getAssessmentsByClass(classId: string): Assessment[] {
  return ASSESSMENTS.filter((a) => a.classId === classId)
}

/** Generated demo results for an assessment, aligned with each student's demo mastery. */
export function getAssessmentResults(assessment: Assessment): AssessmentResult[] {
  const rand = createRandom(assessment.id.charCodeAt(3) * 97 + assessment.id.charCodeAt(4))
  return getStudentsByClass(assessment.classId).map((student, index) => {
    if (index >= assessment.scoresEntered) return { studentId: student.id, score: null }
    const related = student.competencies.filter((c) => assessment.topics.includes(c.name))
    const base = related.length
      ? related.reduce((s, c) => s + c.score, 0) / related.length
      : student.average
    const pct = Math.max(5, Math.min(100, base + rand.int(-8, 8)))
    return { studentId: student.id, score: Math.round((pct / 100) * assessment.maxScore) }
  })
}

export const ASSESSMENT_STATUS_LABEL: Record<Assessment['status'], string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  awaiting_scores: 'Awaiting scores',
  completed: 'Completed',
}

/** A student's recorded results (as %) across their class's assessments, newest first. */
export function getStudentAssessmentHistory(studentId: string, classId: string) {
  return getAssessmentsByClass(classId)
    .filter((a) => a.scoresEntered > 0)
    .map((a) => {
      const result = getAssessmentResults(a).find((r) => r.studentId === studentId)
      const percent = result?.score != null ? Math.round((result.score / a.maxScore) * 100) : null
      return { assessment: a, score: result?.score ?? null, percent }
    })
    .sort((x, y) => y.assessment.date.localeCompare(x.assessment.date))
}
