import type { Prisma } from '../generated/prisma/client.ts'

// Turns database rows into the exact shapes in frontend/src/types/index.ts, so pages can swap
// their demo data for these API responses without other changes.

export const ASSESSMENT_TYPE_LABEL = { test: 'Test', quiz: 'Quiz', assignment: 'Assignment', observation: 'Teacher Observation' } as const
export const ASSESSMENT_TYPE_FROM_LABEL: Record<string, keyof typeof ASSESSMENT_TYPE_LABEL> = {
  Test: 'test', Quiz: 'quiz', Assignment: 'assignment', 'Teacher Observation': 'observation',
}

// Same thresholds as frontend/src/lib/competency.ts.
export function levelFromScore(score: number): 'strength' | 'developing' | 'needs_support' {
  if (score >= 70) return 'strength'
  if (score >= 50) return 'developing'
  return 'needs_support'
}

// "Demo Student 01" → "01" (as the demo shows), "Amina Nakato" → "AN".
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/)
  const last = words.at(-1) ?? ''
  if (/^\d+$/.test(last)) return last.slice(-2)
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? last[0] ?? '' : '')).toUpperCase()
}

// Name order that puts "Student 2" before "Student 10".
export const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' })

export const day = (date: Date) => date.toISOString().slice(0, 10)
const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0)

// "10 min ago", "3 hours ago", "Yesterday", "4 days ago", "2 weeks ago".
export function relativeTime(date: Date, now = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 6e4))
  if (minutes < 60) return `${Math.max(1, minutes)} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  const weeks = Math.round(days / 7)
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`
}

// --- Students ---------------------------------------------------------------

export const studentInclude = {
  class: { select: { framework: true, subjects: true } },
  competencyScores: { include: { competency: true } },
} satisfies Prisma.StudentInclude
type StudentRow = Prisma.StudentGetPayload<{ include: typeof studentInclude }>

export function toStudent(s: StudentRow) {
  const competencies = s.competencyScores
    .sort((a, b) => a.competency.position - b.competency.position)
    .map((c) => ({ competencyId: c.competencyId, name: c.competency.name, topic: c.competency.topic, subject: c.competency.subject, score: c.score, level: c.level }))
  const maths = competencies.filter((c) => c.subject === 'Mathematics')
  const weakest = [...(maths.length ? maths : competencies)].sort((a, b) => a.score - b.score)[0]
  return {
    id: s.id,
    name: s.name,
    initials: initialsOf(s.name),
    classId: s.classId,
    framework: s.class.framework,
    subjects: s.class.subjects,
    average: Math.round(mean(competencies.map((c) => c.score))),
    trend: s.trend,
    needsSupport: maths.some((c) => c.level === 'needs_support'),
    currentFocus: weakest?.name ?? '',
    competencies,
    guardianName: s.guardianName ?? '',
    ...(s.regNumber ? { regNumber: s.regNumber } : {}),
  }
}

// --- Classes ----------------------------------------------------------------

export const classInclude = {
  students: { include: studentInclude },
  teacher: { select: { name: true } },
} satisfies Prisma.SchoolClassInclude
type ClassRow = Prisma.SchoolClassGetPayload<{ include: typeof classInclude }>

export function toSchoolClass(c: ClassRow) {
  const students = c.students.map(toStudent)
  const gaps = new Map<string, { position: number; gap: { competency: string; subject: string; studentsAffected: number } }>()
  for (const s of c.students) {
    for (const sc of s.competencyScores) {
      if (sc.level !== 'needs_support') continue
      const g = gaps.get(sc.competencyId) ?? { position: sc.competency.position, gap: { competency: sc.competency.name, subject: sc.competency.subject, studentsAffected: 0 } }
      g.gap.studentsAffected++
      gaps.set(sc.competencyId, g)
    }
  }
  return {
    id: c.id,
    name: c.name,
    level: c.level,
    framework: c.framework,
    teacherId: c.teacherId ?? '',
    teacherName: c.teacher?.name ?? '',
    subjects: c.subjects,
    studentCount: students.length,
    average: Math.round(mean(students.map((s) => s.average))),
    trend: c.trend,
    ...(c.curriculumLevelId ? { curriculumLevelId: c.curriculumLevelId } : {}),
    // The four gaps affecting most students; ties in catalogue order.
    commonGaps: [...gaps.values()]
      .sort((a, b) => b.gap.studentsAffected - a.gap.studentsAffected || a.position - b.position)
      .slice(0, 4)
      .map((g) => g.gap),
  }
}

// --- Assessments ------------------------------------------------------------

export const assessmentInclude = { results: { select: { score: true } } } satisfies Prisma.AssessmentInclude
type AssessmentRow = Prisma.AssessmentGetPayload<{ include: typeof assessmentInclude }>

export function toAssessment(a: AssessmentRow) {
  const scores = a.results.map((r) => r.score)
  return {
    id: a.id,
    title: a.title,
    type: ASSESSMENT_TYPE_LABEL[a.type],
    subject: a.subject,
    classId: a.classId,
    date: day(a.date),
    maxScore: a.maxScore,
    status: a.status,
    topics: a.topics,
    ...(scores.length ? { average: Math.round((mean(scores) / a.maxScore) * 100) } : {}),
    scoresEntered: scores.length,
  }
}

// --- AI assessments ---------------------------------------------------------

export const aiAssessmentInclude = { questions: { orderBy: { position: 'asc' } } } satisfies Prisma.AiAssessmentInclude
type AiAssessmentRow = Prisma.AiAssessmentGetPayload<{ include: typeof aiAssessmentInclude }>

export function toAiAssessment(a: AiAssessmentRow) {
  return {
    id: a.id,
    title: a.title,
    classId: a.classId,
    subject: a.subject,
    competencies: a.competencies,
    studentIds: a.studentIds,
    questions: a.questions.map((q) => ({
      id: q.id, sourceId: q.sourceId, competency: q.competency, type: q.type, difficulty: q.difficulty, prompt: q.prompt,
      ...(q.type === 'multiple_choice' ? { options: q.options } : {}), answer: q.answer, explanation: q.explanation,
    })),
    difficulty: a.difficulty,
    dueDate: a.dueDate ? day(a.dueDate) : '',
    messageToStudents: a.messageToStudents,
    reportNotes: a.reportNotes,
    rationale: a.rationale,
    curriculumRefs: a.curriculumRefs,
    ...(a.parentNote !== null ? { parentNote: a.parentNote } : {}),
    shareWithParents: a.shareWithParents,
    createdOn: a.createdAt.toISOString(),
    status: a.status,
    ...(a.sentAt ? { sentOn: a.sentAt.toISOString() } : {}),
  }
}

// --- Diagnostics ------------------------------------------------------------

// The report as generated (a snapshot), in the frontend's DiagnosticReport shape.
export function toDiagnostic(r: Prisma.DiagnosticReportGetPayload<object>, guidanceId?: string) {
  const s = r.summary as { identifiedAreas: string[]; strengths: string[]; developing: string[]; needsSupport: string[]; competencies: unknown[]; evidence: unknown[]; processing: string }
  return {
    id: r.id,
    studentId: r.studentId,
    subject: r.subject,
    generatedOn: day(r.generatedAt),
    identifiedAreas: s.identifiedAreas,
    strengths: s.strengths,
    developing: s.developing,
    needsSupport: s.needsSupport,
    competencies: s.competencies,
    evidence: s.evidence,
    processing: s.processing,
    ...(guidanceId ? { guidanceId } : {}),
  }
}

// --- Guidance ---------------------------------------------------------------

interface PlanBody {
  teachingApproach: { method: string; rationale: string }
  sequence: { title: string; detail: string }[]
  pacing: string
  practice: string[]
  outputs: { teacherSheet: string; parentNote: string; studentSequence: string[] }
}
export interface PlanEdits {
  method?: string
  rationale?: string
  pacing?: string
  practice?: string[]
}

// The plan with the teacher's edits applied, plus `edited` and `decidedAt` (as the frontend's GuidanceReviewContext shows them).
export function toGuidancePlan(g: Prisma.GuidancePlanGetPayload<object>) {
  const plan = g.plan as unknown as PlanBody
  const edits = (g.edits ?? null) as PlanEdits | null
  return {
    id: g.id,
    studentId: g.studentId,
    subject: g.subject,
    competencyGap: g.competencyGap,
    curriculumReference: g.curriculumReference,
    createdOn: day(g.createdAt),
    status: g.status,
    teachingApproach: { method: edits?.method ?? plan.teachingApproach.method, rationale: edits?.rationale ?? plan.teachingApproach.rationale },
    sequence: plan.sequence,
    pacing: edits?.pacing ?? plan.pacing,
    practice: edits?.practice ?? plan.practice,
    outputs: plan.outputs,
    ...(g.teacherNote ? { teacherNote: g.teacherNote } : {}),
    edited: Boolean(edits && Object.keys(edits).length),
    ...(g.decidedAt ? { decidedAt: g.decidedAt.toISOString() } : {}),
  }
}

// --- Practice ---------------------------------------------------------------

export const practiceInclude = {
  aiAssessment: { select: { title: true, subject: true, competencies: true, dueDate: true, _count: { select: { questions: true } } } },
} satisfies Prisma.PracticeAssignmentInclude
type PracticeRow = Prisma.PracticeAssignmentGetPayload<{ include: typeof practiceInclude }>

export function toPracticeActivity(p: PracticeRow) {
  const questions = p.aiAssessment._count.questions
  const due = p.aiAssessment.dueDate
  return {
    id: p.id,
    aiAssessmentId: p.aiAssessmentId,
    title: p.aiAssessment.title,
    focus: p.aiAssessment.competencies[0] ?? '',
    subject: p.aiAssessment.subject,
    status: p.status,
    questions,
    estimatedMinutes: Math.max(5, Math.round(questions * 1.5)),
    ...(due && p.status !== 'completed' ? { dueLabel: `Due ${due.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}` } : {}),
    ...(p.completedAt ? { completedOn: day(p.completedAt) } : {}),
    ...(p.feedback ? { feedback: p.feedback } : {}),
  }
}

// --- Notifications ----------------------------------------------------------

export function toNotification(n: Prisma.NotificationGetPayload<object>, role: string) {
  return {
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    time: relativeTime(n.createdAt),
    read: n.readAt !== null,
    roles: [role],
    ...(n.link ? { link: n.link } : {}),
  }
}
