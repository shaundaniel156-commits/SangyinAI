import type { Assessment, AssessmentResult } from '../types'

/** Results loaded from the backend, by assessment id (filled by lib/liveData.ts after sign-in). */
export const LIVE_RESULTS = new Map<string, AssessmentResult[]>()

/** Assessments, loaded from the backend after sign-in (lib/liveData.ts fills the list in place). */
export const ASSESSMENTS: Assessment[] = []

export function getAssessment(id: string): Assessment | undefined {
  return ASSESSMENTS.find((a) => a.id === id)
}

export function getAssessmentsByClass(classId: string): Assessment[] {
  return ASSESSMENTS.filter((a) => a.classId === classId)
}

/** An assessment's results, as loaded from the backend (empty until scores are recorded). */
export function getAssessmentResults(assessment: Assessment): AssessmentResult[] {
  return LIVE_RESULTS.get(assessment.id) ?? []
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
