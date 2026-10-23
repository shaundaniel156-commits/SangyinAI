import { AI_QUESTION_BANK, type QuestionBank } from '../data/aiQuestionBank.ts'
import type { AssessmentDraft, GenerateAssessmentRequest } from './schemas.ts'
 
// Used when there is no internet, no API key, or Gemini cannot answer.
// Picks reviewed questions from the bank, easiest first, across the chosen gaps.
// `ownBank`: the institution's own reviewed questions by topic, used before the built-in bank.
export function offlineDraft(r: GenerateAssessmentRequest, ownBank: Record<string, QuestionBank[]> = {}): AssessmentDraft {
  const order = ['foundation', 'core', 'stretch']
  const pools = r.competencies.map((c) => ({
    competency: c,
    queue: [...(ownBank[c] ?? []), ...(AI_QUESTION_BANK[c] ?? [])]
      .filter((q) => r.types.includes(q.type) && (r.difficulty === 'mixed' || q.difficulty === r.difficulty))
      .sort((a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty)),
  }))
 
  const questions: AssessmentDraft['questions'] = []
  while (questions.length < r.questionCount && pools.some((p) => p.queue.length > 0)) {
    for (const p of pools) {
      const q = p.queue.shift()
      if (q && questions.length < r.questionCount) {
        questions.push({ competency: p.competency, type: q.type, difficulty: q.difficulty, prompt: q.prompt, options: q.options ?? [], answer: q.answer, explanation: q.explanation })
      }
    }
  }
 
  const focus = r.competencies.join(' and ')
  return {
    title: `${r.competencies.length === 1 ? r.competencies[0] : `${r.competencies.length} focus areas`} — Catch-up Practice`,
    messageToStudents: `This practice will help you strengthen ${focus}. Take your time and read the explanation after each answer.`,
    parentNote: `This week your child is practising ${focus}. Ask them to show you one question they solved and explain how they did it.`,
    rationale: [`Prepared offline from the reviewed question bank (${questions.length} questions). Generate again when online for questions written by AI.`],
    questions,
  }
}
 