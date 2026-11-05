/** Practice activities for the signed-in student (or a parent's child), loaded from the backend (lib/liveData.ts). */
import type { AiAssessment, PracticeActivity } from '../types'
import { getClass } from './classes'

export const PRACTICE_ACTIVITIES: PracticeActivity[] = []

/**
 * The teacher's assessments (AI Assessment Builder) a student has answered, as practice records. They are listed
 * apart from PRACTICE_ACTIVITIES ("From your teacher"), so the record views add them with this.
 */
export function teacherPracticeDone(items: AiAssessment[], attempts: Record<string, { score: number; total: number; completedOn: string } | undefined>, studentId: string): PracticeActivity[] {
  return items.flatMap((a) => {
    const attempt = attempts[a.id]
    if (a.status !== 'sent' || !a.studentIds.includes(studentId) || !attempt) return []
    return [{ id: `ai-${a.id}`, aiAssessmentId: a.id, title: a.title, focus: a.competencies.join(', '), subject: a.subject, status: 'completed' as const, questions: attempt.total, estimatedMinutes: Math.max(5, Math.round(attempt.total * 1.5)), completedOn: attempt.completedOn, score: attempt.score }]
  })
}

/** Days in a row, ending today (or yesterday), with at least one practice activity completed. */
export function practiceStreakDays(activities: PracticeActivity[] = PRACTICE_ACTIVITIES): number {
  const days = new Set(activities.filter((a) => a.completedOn).map((a) => new Date(a.completedOn!).toDateString()))
  const day = new Date()
  if (!days.has(day.toDateString())) day.setDate(day.getDate() - 1)
  let streak = 0
  while (days.has(day.toDateString())) {
    streak++
    day.setDate(day.getDate() - 1)
  }
  return streak
}

/** Recently completed practice, newest first. */
export function recentAchievements(activities: PracticeActivity[] = PRACTICE_ACTIVITIES, limit = 3): { id: string; title: string; date: string }[] {
  return activities
    .filter((a) => a.status === 'completed' && a.completedOn)
    .sort((a, b) => b.completedOn!.localeCompare(a.completedOn!))
    .slice(0, limit)
    .map((a) => ({ id: a.id, title: `Completed “${a.title}”`, date: a.completedOn! }))
}

/** Messages from teachers: the note on each assessment sent to this student, newest first. */
export function teacherMessages(items: AiAssessment[], studentId: string): { id: string; from: string; title: string; message: string; date: string }[] {
  return items
    .filter((a) => a.status === 'sent' && a.studentIds.includes(studentId) && a.messageToStudents.trim())
    .map((a) => ({ id: a.id, from: getClass(a.classId)?.teacherName || 'Your teacher', title: a.title, message: a.messageToStudents, date: a.sentOn ?? a.createdOn }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** Student self-report options (difficulty and confidence). */
export const DIFFICULTY_OPTIONS = [
  { id: 'easy', label: 'Easy' },
  { id: 'okay', label: 'Okay' },
  { id: 'difficult', label: 'Difficult' },
] as const

export const CONFIDENCE_OPTIONS = [
  { id: 'confident', label: 'I feel confident' },
  { id: 'unsure', label: 'A little unsure' },
  { id: 'need_help', label: 'I need more help' },
] as const

export type DifficultyChoice = (typeof DIFFICULTY_OPTIONS)[number]['id']
export type ConfidenceChoice = (typeof CONFIDENCE_OPTIONS)[number]['id']
