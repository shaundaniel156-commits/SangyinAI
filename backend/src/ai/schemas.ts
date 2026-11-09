import { z } from 'zod'
 
// What the frontend sends when a teacher presses "Generate draft".
// No student names are included — only the teaching context.
export const GenerateAssessmentRequestSchema = z.object({
  classLevel: z.string(),
  framework: z.enum(['uganda', 'cambridge', 'institution']),
  subject: z.string(),
  // Empty: the AI chooses the topics from the teacher's instructions (in reportNotes).
  competencies: z.array(z.string()),
  curriculumObjectives: z.array(z.string()),
  classSummary: z.array(z.string()),
  questionCount: z.number().int().min(1).max(15),
  difficulty: z.enum(['foundation', 'core', 'stretch', 'mixed']),
  types: z.array(z.enum(['multiple_choice', 'short_answer', 'written_work'])).min(1),
  reportNotes: z.string().max(4000),
})
export type GenerateAssessmentRequest = z.infer<typeof GenerateAssessmentRequestSchema>
 
// The exact shape the AI must reply with (structured output).
export const DraftQuestionSchema = z.object({
  competency: z.string(),
  type: z.enum(['multiple_choice', 'short_answer', 'written_work']),
  difficulty: z.enum(['foundation', 'core', 'stretch']),
  prompt: z.string(),
  options: z.array(z.string()).describe('Exactly 4 options for multiple_choice; an empty list otherwise'),
  answer: z.string().describe('For multiple_choice, copy the correct option exactly. For short_answer, the bare value with no unit or currency word (e.g. "15000", "3/4", "went"); separate alternative right answers with " / ". For written_work, the model answer with the working or points a marker should look for'),
  explanation: z.string(),
})
 
// How to teach each targeted gap: method, lesson steps with minutes, the total time to spend, and when to stop.
export const TeachingPlanSchema = z.object({
  overview: z.string().describe('Two sentences for the teacher: the order to take the topics in and the time to spend in all'),
  topics: z.array(
    z.object({
      competency: z.string().describe('The competency name, copied word for word'),
      approach: z.string().describe('The teaching method and why it fits the evidence, in one or two sentences'),
      steps: z.array(z.object({ title: z.string(), detail: z.string(), minutes: z.number().int().min(5).max(60) })).min(2).max(5),
      recommendedTime: z.string().describe('e.g. "Two 20-minute sessions over one week"'),
      stopWhen: z.string().describe('The sign that learners have got it and should move on, so time is not wasted on over-practice'),
      commonMistakes: z.array(z.string()).max(3),
    }),
  ),
})
export type TeachingPlan = z.infer<typeof TeachingPlanSchema>

export const AssessmentDraftSchema = z.object({
  title: z.string(),
  messageToStudents: z.string(),
  parentNote: z.string(),
  rationale: z.array(z.string()),
  questions: z.array(DraftQuestionSchema),
  teachingPlan: TeachingPlanSchema,
})
export type AssessmentDraft = z.infer<typeof AssessmentDraftSchema>
 
// Shape used by the offline question bank (matches the frontend's AiQuestion type).
export interface AiQuestion {
  id: string
  sourceId: string
  competency: string
  type: 'multiple_choice' | 'short_answer' | 'written_work'
  difficulty: 'foundation' | 'core' | 'stretch'
  prompt: string
  options?: string[]
  answer: string
  explanation: string
}
