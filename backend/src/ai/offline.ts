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
    teachingPlan: templatePlan(r.competencies),
  }
}

// A sound general plan for when the AI is not available: one entry per gap, worked examples then guided practice.
export function templatePlan(competencies: string[]): AssessmentDraft['teachingPlan'] {
  return {
    overview: `Take the gaps one at a time, weakest first: ${competencies.join(', ')}. About 40 minutes per gap over a week is usually enough; move on as soon as the quick check is passed.`,
    topics: competencies.map((competency) => ({
      competency,
      approach: `Worked examples with guided practice: model the method step by step, then let learners try in pairs while you check. (General plan — generate again when online for one based on the class's evidence.)`,
      steps: [
        { title: 'Check the prerequisite', detail: `Two quick questions on the skill ${competency} builds on.`, minutes: 5 },
        { title: `Model ${competency}`, detail: 'Work through two examples aloud, naming each step.', minutes: 10 },
        { title: 'Guided practice', detail: 'Learners try two questions in pairs while you move around and check.', minutes: 15 },
        { title: 'Quick check', detail: 'Five short questions done alone.', minutes: 10 },
      ],
      recommendedTime: 'Two 20-minute sessions over one week',
      stopWhen: 'Most learners get 4 of the 5 quick-check questions right on two different days.',
      commonMistakes: [],
    })),
  }
}
 