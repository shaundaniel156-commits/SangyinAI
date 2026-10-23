import { z } from 'zod'
 
// What the frontend sends when a teacher presses "Generate draft".
// No student names are included — only the teaching context.
export const GenerateAssessmentRequestSchema = z.object({
  classLevel: z.string(),
  framework: z.enum(['uganda', 'cambridge', 'institution']),
  subject: z.string(),
  competencies: z.array(z.string()).min(1),
  curriculumObjectives: z.array(z.string()),
  classSummary: z.array(z.string()),
  questionCount: z.number().int().min(1).max(15),
  difficulty: z.enum(['foundation', 'core', 'stretch', 'mixed']),
  types: z.array(z.enum(['multiple_choice', 'short_answer'])).min(1),
  reportNotes: z.string().max(4000),
})
export type GenerateAssessmentRequest = z.infer<typeof GenerateAssessmentRequestSchema>
 
// The exact shape the AI must reply with (structured output).
export const DraftQuestionSchema = z.object({
  competency: z.string(),
  type: z.enum(['multiple_choice', 'short_answer']),
  difficulty: z.enum(['foundation', 'core', 'stretch']),
  prompt: z.string(),
  options: z.array(z.string()).describe('Exactly 4 options for multiple_choice; an empty list for short_answer'),
  answer: z.string().describe('For multiple_choice, copy the correct option exactly'),
  explanation: z.string(),
})
 
export const AssessmentDraftSchema = z.object({
  title: z.string(),
  messageToStudents: z.string(),
  parentNote: z.string(),
  rationale: z.array(z.string()),
  questions: z.array(DraftQuestionSchema),
})
export type AssessmentDraft = z.infer<typeof AssessmentDraftSchema>
 
// Shape used by the offline question bank (matches the frontend's AiQuestion type).
export interface AiQuestion {
  id: string
  sourceId: string
  competency: string
  type: 'multiple_choice' | 'short_answer'
  difficulty: 'foundation' | 'core' | 'stretch'
  prompt: string
  options?: string[]
  answer: string
  explanation: string
}
