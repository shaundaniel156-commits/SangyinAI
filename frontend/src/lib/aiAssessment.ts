/**
 * AI assessment drafting — SIMULATED in this prototype.
 *
 * `generateAssessmentDraft` is the single seam to replace when a model is
 * connected: send the same input (report data + teacher notes + settings) to a
 * backend endpoint that calls the model, and return the same draft shape.
 * Never call a model API with a secret key directly from the browser.
 */
import { AI_QUESTION_BANK, type QuestionBank } from '../data/aiQuestionBank'
import { getClass } from '../data/classes'
import { CURRICULUM_FRAMEWORKS, getFramework } from '../data/curriculum'
import { DIAGNOSTIC_REPORTS } from '../data/diagnostics'
import { getStudentsByClass } from '../data/students'
import type { AiAssessment, AiDifficulty, AiQuestion, AiQuestionType, CompetencyLevel, Student, Subject, TeachingPlan } from '../types'
import { API_URL, apiHeaders } from './api'

export const DIFFICULTY_LABEL: Record<AiDifficulty | 'mixed', string> = {
  foundation: 'Foundation',
  core: 'Core',
  stretch: 'Stretch',
  mixed: 'Mixed',
}

export const QUESTION_TYPE_LABEL: Record<AiQuestionType, string> = {
  multiple_choice: 'Multiple choice',
  short_answer: 'Short answer',
  written_work: 'Written work',
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
/**
 * Each student's results per topic in a subject: their competency scores, overridden by their latest exam analysis
 * (Analyse exam results) for that subject. Topic name → student id → result.
 */
function resultsByTopic(classId: string, subject: Subject): Map<string, Map<string, { score: number; level: CompetencyLevel }>> {
  const byTopic = new Map<string, Map<string, { score: number; level: CompetencyLevel }>>()
  const add = (topic: string, studentId: string, score: number, level: CompetencyLevel) => {
    if (!byTopic.has(topic)) byTopic.set(topic, new Map())
    byTopic.get(topic)!.set(studentId, { score, level })
  }
  for (const s of getStudentsByClass(classId)) {
    for (const c of s.competencies) if (c.subject === subject) add(c.name, s.id, c.score, c.level)
    const latest = DIAGNOSTIC_REPORTS.filter((r) => r.studentId === s.id && r.subject.toLowerCase() === subject.toLowerCase()).sort((a, b) => b.generatedOn.localeCompare(a.generatedOn))[0]
    for (const c of latest?.competencies ?? []) add(c.name, s.id, c.score, c.level)
  }
  return byTopic
}

/** The topics found in the class's results for a subject, the weakest first. Topics nobody has results for are left out. */
export function detectGaps(classId: string, subject: Subject): CompetencyGap[] {
  return [...resultsByTopic(classId, subject)]
    .map(([competency, results]) => {
      const scores = [...results.values()]
      return {
        competency,
        subject,
        needsSupport: scores.filter((s) => s.level === 'needs_support').length,
        developing: scores.filter((s) => s.level === 'developing').length,
        average: Math.round(scores.reduce((t, s) => t + s.score, 0) / scores.length),
      }
    })
    .sort((a, b) => b.needsSupport - a.needsSupport || a.average - b.average)
}

/** Students in the class who need help with at least one of the chosen competencies. */
export function studentsWithGaps(classId: string, subject: Subject, competencies: string[], includeDeveloping: boolean): Student[] {
  const needing = new Set<string>()
  for (const [topic, results] of resultsByTopic(classId, subject)) {
    if (!competencies.includes(topic)) continue
    for (const [id, r] of results) if (r.level === 'needs_support' || (includeDeveloping && r.level === 'developing')) needing.add(id)
  }
  return getStudentsByClass(classId).filter((s) => needing.has(s.id))
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

// "ratio and proportions", "RATIO & PROPORTION" and "Ratio and Proportion" are the same topic: compare names without case, punctuation, "and" or a final s.
const topicKey = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w && !['and', 'the', 'of'].includes(w))
    .map((w) => w.replace(/s$/, ''))
    .join(' ')

/** The local bank's questions for a topic, matched loosely by name. */
function bankFor(competency: string): QuestionBank[] {
  const key = topicKey(competency)
  return Object.entries(AI_QUESTION_BANK).find(([name]) => topicKey(name) === key)?.[1] ?? []
}

let questionSeq = 0
const toQuestion = (competency: string, q: QuestionBank): AiQuestion => ({ ...q, id: `q-${Date.now().toString(36)}-${questionSeq++}`, competency })

const matches = (q: QuestionBank, difficulty: GenerateInput['difficulty'], types: AiQuestionType[]) =>
  (difficulty === 'mixed' || q.difficulty === difficulty) && types.includes(q.type)

/** Picks questions round-robin across competencies, easiest first; relaxes difficulty if the bank runs short. */
function pickQuestions(input: GenerateInput): AiQuestion[] {
  const order: AiDifficulty[] = ['foundation', 'core', 'stretch']
  const pools = input.competencies.map((c) => {
    const bank = bankFor(c)
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
/**
 * The curriculum level a class follows: the one it is linked to (Manual feed), otherwise the level of its
 * curriculum with the same name (class levels can be longer, e.g. "Lower Secondary · Stage 7" → "Stage 7").
 */
export function levelForClass(classId: string) {
  const cls = getClass(classId)
  if (!cls) return undefined
  if (cls.curriculumLevelId) {
    for (const f of CURRICULUM_FRAMEWORKS) {
      const linked = f.levels.find((l) => l.id === cls.curriculumLevelId)
      if (linked) return { framework: f, level: linked }
    }
  }
  const framework = getFramework(cls.framework)
  const level = framework.levels.find((l) => l.name === cls.level) ?? framework.levels.find((l) => cls.level.split(/\s*·\s*/).includes(l.name))
  return level ? { framework, level } : undefined
}

/** A subject or course unit at the class's curriculum level, matched by name or code. */
function curriculumSubjectFor(classId: string, subject: Subject) {
  const found = levelForClass(classId)
  return found?.level.subjects.find((s) => s.name === subject || (s.code && s.code === subject))
}

/** Topic names from the class's curriculum for a subject (used when no scores exist yet, e.g. a university cohort). */
export function curriculumTopicsFor(classId: string, subject: Subject): string[] {
  return curriculumSubjectFor(classId, subject)?.topics.map((t) => t.name) ?? []
}

/** Subjects or course units the class can be assessed in: its own list, plus those in its curriculum level. */
export function subjectsForClass(classId: string): Subject[] {
  const cls = getClass(classId)
  const fromLevel = levelForClass(classId)?.level.subjects.map((s) => s.name) ?? []
  return [...new Set([...(cls?.subjects ?? []), ...fromLevel])]
}

export function curriculumRefsFor(classId: string, subject: Subject, competency: string): string[] {
  const cls = getClass(classId)
  if (!cls) return []
  const found = levelForClass(classId)
  const framework = found?.framework ?? getFramework(cls.framework)
  const level = found?.level
  const topic = curriculumSubjectFor(classId, subject)?.topics.find((t) => t.name === competency)
  // Official objectives the school added come first; otherwise Sangyin's own outline statements for the topic.
  const objectives = topic?.competencies.flatMap((c) => c.objectives) ?? []
  if (objectives.length) return objectives.map((o) => `${o.code} — ${o.text}`)
  const where = `${framework.shortName} · ${level?.name ?? cls.level} ${subject} · ${competency}`
  if (topic?.competencies.length) return topic.competencies.map((c) => `${where} — ${c.name}`)
  return [where]
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
  if (questions.length === 0) {
    lines.push(`The AI service could not be reached and the question bank has nothing yet for ${input.competencies.join(', ')}, so no questions were written. Try again in a few minutes.`)
  } else if (questions.length < input.questionCount) {
    lines.push(`Only ${questions.length} suitable questions matched your settings — add more question types or gaps for a longer assessment.`)
  }
  if (input.reportNotes.trim()) lines.push('Your report notes were included as context when choosing and ordering questions.')
  if (cls) lines.push(`Questions are aligned to the ${getFramework(cls.framework).name} for ${cls.level} — see the curriculum references below.`)
  return lines
}

/** How many bank questions exist for these gaps and types — the most a draft can hold. */
export function availableQuestionCount(competencies: string[], types: AiQuestionType[]): number {
  return competencies.reduce((n, c) => n + bankFor(c).filter((q) => types.includes(q.type)).length, 0)
}

// A sound general plan for when the AI can't be reached (the backend's ai/offline.ts has the same one).
function templatePlan(competencies: string[]): TeachingPlan {
  return {
    overview: `Take the gaps one at a time, weakest first: ${competencies.join(', ')}. About 40 minutes per gap over a week is usually enough; move on as soon as the quick check is passed.`,
    topics: competencies.map((competency) => ({
      competency,
      approach: 'Worked examples with guided practice: model the method step by step, then let learners try in pairs while you check. (General plan — generate again when online for one based on the class’s evidence.)',
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

/** Offline fallback: builds a draft from the local question bank. */
export async function generateLocalDraft(input: GenerateInput): Promise<AiDraft> {
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
    teachingPlan: templatePlan(input.competencies),
    source: 'offline',
  }
}
 
/** The draft content the backend returns (written by Gemini, or by its offline bank). */
interface ServerDraft {
  title: string
  messageToStudents: string
  parentNote: string
  rationale: string[]
  teachingPlan?: TeachingPlan
  questions: { competency: string; type: AiQuestionType; difficulty: AiDifficulty; prompt: string; options: string[]; answer: string; explanation: string }[]
}
 
/**
 * Real AI: asks the backend (which asks Gemini). Falls back to the local bank if the server can't be reached,
 * the teacher isn't signed in (401/403), or they have reached the hourly limit (429).
 */
export async function generateAssessmentDraft(input: GenerateInput): Promise<AiDraft> {
  const cls = getClass(input.classId)
  if (!cls) return generateLocalDraft(input)
  const gaps = detectGaps(input.classId, input.subject).filter((g) => input.competencies.includes(g.competency))
  const curriculumRefs = input.competencies.flatMap((c) => curriculumRefsFor(input.classId, input.subject, c))
 
  // The anonymous request (no student names). Kept with the draft so an approved draft can become a fine-tuning example.
  const request = {
    classLevel: cls.level,
    framework: cls.framework,
    subject: input.subject,
    competencies: input.competencies,
    curriculumObjectives: curriculumRefs,
    classSummary: [
      ...gaps.map((g) => `${g.competency}: ${g.needsSupport} of ${cls.studentCount} students need support, ${g.developing} developing (class mastery ${g.average}%).`),
      ...input.competencies.filter((c) => !gaps.some((g) => g.competency === c)).map((c) => `${c}: no scores recorded yet — write practice that checks the basics and builds up.`),
    ],
    questionCount: input.questionCount,
    difficulty: input.difficulty,
    types: input.types,
    reportNotes: input.reportNotes,
  }

  try {
    const res = await fetch(`${API_URL}/ai/assessments/generate`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(request) })
    if (!res.ok) throw new Error(`Server replied ${res.status}`)
    const { draft, source } = (await res.json()) as { draft: ServerDraft; source: 'gemini' | 'offline' }
 
    return {
      title: draft.title,
      classId: input.classId,
      subject: input.subject,
      competencies: input.competencies,
      studentIds: input.studentIds,
      questions: draft.questions.map((q) => {
        const n = questionSeq++
        return { ...q, id: `q-${Date.now().toString(36)}-${n}`, sourceId: `ai-${n}`, options: q.type === 'multiple_choice' ? q.options : undefined }
      }),
      difficulty: input.difficulty,
      dueDate: input.dueDate,
      messageToStudents: draft.messageToStudents,
      reportNotes: input.reportNotes,
      rationale: draft.rationale,
      curriculumRefs,
      parentNote: draft.parentNote,
      shareWithParents: true,
      teachingPlan: draft.teachingPlan ?? templatePlan(input.competencies),
      source,
      requestSent: request,
    }
  } catch (error) {
    console.warn('AI server unavailable — using the local question bank instead.', error)
    return generateLocalDraft(input)
  }
}

/** A different bank question for the same competency (for "Regenerate"), or null when none is left. */
export function replacementQuestion(current: AiQuestion, usedSourceIds: Set<string>): AiQuestion | null {
  const bank = bankFor(current.competency)
  const next = bank.find((q) => !usedSourceIds.has(q.sourceId) && q.difficulty === current.difficulty) ?? bank.find((q) => !usedSourceIds.has(q.sourceId))
  return next ? toQuestion(current.competency, next) : null
}

/** One more unused question across the targeted competencies (for "Add question"). */
export function extraQuestion(competencies: string[], usedSourceIds: Set<string>): AiQuestion | null {
  for (const c of competencies) {
    const next = bankFor(c).find((q) => !usedSourceIds.has(q.sourceId))
    if (next) return toQuestion(c, next)
  }
  return null
}
