/** DEMO DATA — sample practice activities for the student and parent portals. */
import type { PracticeActivity } from '../types'

export const PRACTICE_ACTIVITIES: PracticeActivity[] = [
  { id: 'pa-1', title: 'Understanding Ratios', focus: 'Ratio and Proportion', subject: 'Mathematics', status: 'in_progress', questions: 10, estimatedMinutes: 15, dueLabel: 'Due Friday' },
  { id: 'pa-2', title: 'Equivalent Ratios', focus: 'Ratio and Proportion', subject: 'Mathematics', status: 'not_started', questions: 8, estimatedMinutes: 12, dueLabel: 'Next week' },
  { id: 'pa-3', title: 'Ratio Word Problems', focus: 'Ratio and Proportion', subject: 'Mathematics', status: 'not_started', questions: 6, estimatedMinutes: 15, dueLabel: 'Next week' },
  { id: 'pa-4', title: 'Finding a Percentage', focus: 'Percentages', subject: 'Mathematics', status: 'not_started', questions: 8, estimatedMinutes: 12, dueLabel: 'In two weeks' },
  { id: 'pa-5', title: 'Equivalent Fractions', focus: 'Fractions', subject: 'Mathematics', status: 'completed', questions: 8, estimatedMinutes: 10, completedOn: '2026-09-22', feedback: 'okay' },
  { id: 'pa-6', title: 'Place Value', focus: 'Whole Numbers', subject: 'Mathematics', status: 'completed', questions: 10, estimatedMinutes: 10, completedOn: '2026-09-16', feedback: 'easy' },
]

/** Progress within the in-progress activity (questions answered). */
export const DEMO_IN_PROGRESS_ANSWERED = 4

/** Sample feedback messages shown to the student (written by the teacher / plan). */
export const STUDENT_FEEDBACK = [
  { id: 'fb-1', from: 'Demo Teacher', title: 'Ratio and Proportion quiz', message: 'Good start comparing quantities! Next, practise writing ratios in their simplest form.', date: '2026-09-23' },
  { id: 'fb-2', from: 'Demo Teacher', title: 'Equivalent Fractions practice', message: 'Well done — you found all the matching fractions.', date: '2026-09-22' },
]

/** Consecutive days with practice (matches the "Practised 3 days in a row" achievement). */
export const LEARNING_STREAK_DAYS = 3

/** Sample achievements for parent and student views. */
export const RECENT_ACHIEVEMENTS = [
  { id: 'ra-1', title: 'Completed “Equivalent Fractions” practice', date: '2026-09-22' },
  { id: 'ra-2', title: 'Strong result in Whole Numbers', date: '2026-09-16' },
  { id: 'ra-3', title: 'Practised 3 days in a row', date: '2026-09-12' },
]

/** Sample home-support suggestions (parent-facing, plain language). */
export const HOME_SUPPORT = [
  { id: 'hs-1', focus: 'Ratio and Proportion', title: 'Share things fairly', tip: 'Spend a few minutes practising simple ratio examples, such as sharing sweets or cups of water in a 2 to 1 pattern.', minutes: 10 },
  { id: 'hs-2', focus: 'Percentages', title: 'Talk about halves and quarters', tip: 'When shopping or cooking, ask what half or a quarter of an amount is.', minutes: 5 },
  { id: 'hs-3', focus: 'General', title: 'Ask about their practice', tip: 'Ask your child to show you one practice question they found interesting this week.', minutes: 5 },
]

/**
 * DEMO — one sample question shown in the practice preview (UI only; answers
 * are not checked or saved in this prototype).
 */
export const SAMPLE_PRACTICE_QUESTION = {
  focus: 'Ratio and Proportion',
  prompt: 'In a bag there are 2 red beads for every 3 blue beads. What is the ratio of red beads to blue beads?',
  options: ['2 : 3', '3 : 2', '2 : 5', '5 : 2'],
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
