/**
 * AI assessment drafting — SIMULATED in this prototype.
 *
 * `generateAssessmentDraft` is the single seam to replace when a model is
 * connected: send the same input (report data + teacher notes + settings) to a
 * backend endpoint that calls the model, and return the same draft shape.
 * Never call a model API with a secret key directly from the browser.
 */
import { AI_QUESTION_BANK, type BankQuestion } from '../data/aiQuestionBank'
import { getClass } from '../data/classes'
import { getFramework } from '../data/curriculum'
import { DEMO_COMPETENCIES, getStudentsByClass } from '../data/students'
import type { AiAssessment, AiDifficulty, AiQuestion, AiQuestionType, Student, Subject } from '../types'

export const DIFFICULTY_LABEL: Record<AiDifficulty | 'mixed', string> = {
  foundation: 'Foundation',
  core: 'Core',
  stretch: 'Stretch',
  mixed: 'Mixed',
}

export const QUESTION_TYPE_LABEL: Record<AiQuestionType, string> = {
  multiple_choice: 'Multiple choice',
  short_answer: 'Short answer',
}

export interface CompetencyGap {
  competency: string
  subject: Subject
  needsSupport: number
  developing: number
  /** Class average mastery for this competency, 0–100. */
  average: number
}

/** Competency gaps for one class and subject, read from recorded results (worst first). */
export function detectGaps(classId: string, subject: Subject): CompetencyGap[] {
  const students = getStudentsByClass(classId)
  return DEMO_COMPETENCIES.filter((c) => c.subject === subject)
    .map((c) => {
      const scores = students.flatMap((s) => s.competencies.filter((sc) => sc.competencyId === c.id))
      return {
        competency: c.name,
        subject,
        needsSupport: scores.filter((s) => s.level === 'needs_support').length,
        developing: scores.filter((s) => s.level === 'developing').length,
        average: Math.round(scores.reduce((t, s) => t + s.score, 0) / Math.max(scores.length, 1)),
      }
    })
    .sort((a, b) => b.needsSupport - a.needsSupport || a.average - b.average)
}

/** Students in the class who need help with at least one of the chosen competencies. */
export function studentsWithGaps(classId: string, competencies: string[], includeDeveloping: boolean): Student[] {
  const wanted = new Set(competencies)
  return getStudentsByClass(classId).filter((s) =>
    s.competencies.some((c) => wanted.has(c.name) && (c.level === 'needs_support' || (includeDeveloping && c.level === 'developing'))),
  )
}

export interface GenerateInput {
  classId: string
  subject: Subject
  competencies: string[]
  studentIds: string[]
  questionCount: number
  difficulty: AiDifficulty | 'mixed'
  types: AiQuestionType[]
  dueDate: string
  reportNotes: string
}

export type AiDraft = Omit<AiAssessment, 'id' | 'createdOn' | 'status' | 'sentOn'>

let questionSeq = 0
const toQuestion = (competency: string, q: BankQuestion): AiQuestion => ({ ...q, id: `q-${Date.now().toString(36)}-${questionSeq++}`, competency })

const matches = (q: BankQuestion, difficulty: GenerateInput['difficulty'], types: AiQuestionType[]) =>
  (difficulty === 'mixed' || q.difficulty === difficulty) && types.includes(q.type)

/** Picks questions round-robin across competencies, easiest first; relaxes difficulty if the bank runs short. */
function pickQuestions(input: GenerateInput): AiQuestion[] {
  const order: AiDifficulty[] = ['foundation', 'core', 'stretch']
  const pools = input.competencies.map((c) => {
    const bank = AI_QUESTION_BANK[c] ?? []
    const preferred = bank.filter((q) => matches(q, input.difficulty, input.types))
    const fallback = bank.filter((q) => !preferred.includes(q) && input.types.includes(q.type))
    const sorted = [...preferred, ...fallback].sort((a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty))
    return { competency: c, queue: sorted }
  })
  const picked: AiQuestion[] = []
  while (picked.length < input.questionCount && pools.some((p) => p.queue.length)) {
    for (const p of pools) {
      const next = p.queue.shift()
      if (next && picked.length < input.questionCount) picked.push(toQuestion(p.competency, next))
    }
  }
  return picked
}

/**
 * Curriculum references for a gap in this class's framework and level — objective codes when the
 * demo curriculum has the topic, otherwise a framework/level/topic reference.
 */
export function curriculumRefsFor(classId: string, subject: Subject, competency: string): string[] {
  const cls = getClass(classId)
  if (!cls) return []
  const framework = getFramework(cls.framework)
  const level = framework.levels.find((l) => l.name === cls.level)
  const topic = level?.subjects.find((s) => s.name === subject)?.topics.find((t) => t.name === competency)
  const objectives = topic?.competencies.flatMap((c) => c.objectives) ?? []
  if (objectives.length === 0) return [`${framework.shortName} · ${cls.level} ${subject} · ${competency}`]
  return objectives.map((o) => `${o.code} — ${o.text}`)
}

function buildRationale(input: GenerateInput, questions: AiQuestion[]): string[] {
  const cls = getClass(input.classId)
  const gaps = detectGaps(input.classId, input.subject).filter((g) => input.competencies.includes(g.competency))
  const lines = gaps.map(
    (g) => `${g.competency}: ${g.needsSupport} of ${cls?.studentCount ?? '—'} students need support and ${g.developing} are still developing (class mastery ${g.average}%).`,
  )
  const foundation = questions.filter((q) => q.difficulty === 'foundation').length
  lines.push(
    `Questions start with ${foundation} foundation item${foundation === 1 ? '' : 's'} to rebuild confidence, then move to core and stretch items so progress can be measured.`,
  )
  if (questions.length < input.questionCount) {
    lines.push(`Only ${questions.length} suitable questions matched your settings — add more question types or gaps for a longer assessment.`)
  }
  if (input.reportNotes.trim()) lines.push('Your report notes were included as context when choosing and ordering questions.')
  if (cls) lines.push(`Questions are aligned to the ${getFramework(cls.framework).name} for ${cls.level} — see the curriculum references below.`)
  return lines
}

/** How many bank questions exist for these gaps and types — the most a draft can hold. */
export function availableQuestionCount(competencies: string[], types: AiQuestionType[]): number {
  return competencies.reduce((n, c) => n + (AI_QUESTION_BANK[c] ?? []).filter((q) => types.includes(q.type)).length, 0)
}

/** Simulated model call: resolves after a short delay with a draft for teacher review. */
export async function generateAssessmentDraft(input: GenerateInput): Promise<AiDraft> {
  await new Promise((r) => setTimeout(r, 2600))
  const questions = pickQuestions(input)
  const focus = input.competencies.length === 1 ? input.competencies[0]! : `${input.competencies.length} focus areas`
  return {
    title: `${focus} — Catch-up Practice`,
    classId: input.classId,
    subject: input.subject,
    competencies: input.competencies,
    studentIds: input.studentIds,
    questions,
    difficulty: input.difficulty,
    dueDate: input.dueDate,
    messageToStudents: `This practice will help you strengthen ${input.competencies.join(' and ')}. Take your time, show your working, and check the explanation after each answer.`,
    reportNotes: input.reportNotes,
    rationale: buildRationale(input, questions),
    curriculumRefs: input.competencies.flatMap((c) => curriculumRefsFor(input.classId, input.subject, c)),
    parentNote: `This week your child is practising ${input.competencies.join(' and ')} with a short set of questions from school. You can help by asking them to show you one question they solved and explain how they worked it out. A few minutes is enough.`,
    shareWithParents: true,
  }
}

/** A different bank question for the same competency (for "Regenerate"), or null when none is left. */
export function replacementQuestion(current: AiQuestion, usedSourceIds: Set<string>): AiQuestion | null {
  const bank = AI_QUESTION_BANK[current.competency] ?? []
  const next = bank.find((q) => !usedSourceIds.has(q.sourceId) && q.difficulty === current.difficulty) ?? bank.find((q) => !usedSourceIds.has(q.sourceId))
  return next ? toQuestion(current.competency, next) : null
}

/** One more unused question across the targeted competencies (for "Add question"). */
export function extraQuestion(competencies: string[], usedSourceIds: Set<string>): AiQuestion | null {
  for (const c of competencies) {
    const next = (AI_QUESTION_BANK[c] ?? []).find((q) => !usedSourceIds.has(q.sourceId))
    if (next) return toQuestion(c, next)
  }
  return null
}
