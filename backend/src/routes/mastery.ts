import { topicKey } from '../ai/offline.ts'
import { prisma } from '../db/client.ts'
import { isCorrect } from './marking.ts'
import { levelFromScore } from './mappers.ts'

/**
 * A student's mastery of each topic (CompetencyScore) is what the rest of the app reads: their average, "needs
 * support", current focus, the class's common gaps, the performance pages and the AI's automatic topics. It is
 * worked out here from everything entered about the student:
 *   - exam analyses (Analyse exam results): the score diagnosed for each topic;
 *   - assessment marks: the student's percentage, for each topic the assessment covers;
 *   - practice from the AI Assessment Builder: the share of questions right, per topic.
 * The estimate for a topic is the average of its RECENT most recent results, so new work moves it without one
 * result deciding everything. Call recomputeMastery after any of those is saved.
 */
const RECENT = 3

interface Evidence {
  subject: string
  name: string
  topic?: string
  percent: number
  at: Date
}

// "mathematics|ratio proportion": the same topic however it was typed.
const keyOf = (subject: string, name: string) => `${subject.trim().toLowerCase()}|${topicKey(name)}`

export async function recomputeMastery(studentIds: string[]): Promise<void> {
  const ids = [...new Set(studentIds)]
  if (!ids.length) return

  const [results, reports, practice] = await Promise.all([
    prisma.assessmentResult.findMany({ where: { studentId: { in: ids } }, include: { assessment: { select: { subject: true, topics: true, maxScore: true, date: true } } } }),
    prisma.diagnosticReport.findMany({ where: { studentId: { in: ids } } }),
    prisma.practiceAssignment.findMany({
      where: { studentId: { in: ids }, completedAt: { not: null } },
      include: { aiAssessment: { select: { subject: true, questions: { select: { id: true, competency: true, type: true, answer: true } } } } },
    }),
  ])
  // Marks on photos of written work, by practice copy. Read apart, so that trouble here (say, a database that has
  // not had the written-work update yet) never stops the rest of the mastery being worked out.
  const photoMarks = new Map<string, Map<string, boolean | null>>()
  const uploads = await prisma.practiceUpload.findMany({ where: { assignmentId: { in: practice.map((p) => p.id) } }, select: { assignmentId: true, questionId: true, correct: true } }).catch(() => [])
  for (const u of uploads) photoMarks.set(u.assignmentId, (photoMarks.get(u.assignmentId) ?? new Map()).set(u.questionId, u.correct))

  // Everything known about each student, topic by topic.
  const byStudent = new Map<string, Map<string, Evidence[]>>()
  const add = (studentId: string, e: Evidence) => {
    if (!e.name.trim() || !Number.isFinite(e.percent)) return
    const topics = byStudent.get(studentId) ?? new Map<string, Evidence[]>()
    byStudent.set(studentId, topics)
    const key = keyOf(e.subject, e.name)
    topics.set(key, [...(topics.get(key) ?? []), e])
  }

  for (const r of results) {
    if (!r.assessment.maxScore) continue
    const percent = (r.score / r.assessment.maxScore) * 100
    for (const topic of r.assessment.topics) add(r.studentId, { subject: r.assessment.subject, name: topic, percent, at: r.assessment.date })
  }
  for (const d of reports) {
    const summary = d.summary as { competencies?: { name: string; topic?: string; score: number }[] }
    for (const c of summary.competencies ?? []) add(d.studentId, { subject: d.subject, name: c.name, topic: c.topic, percent: c.score, at: d.generatedAt })
  }
  for (const p of practice) {
    const answers = (p.answers ?? {}) as Record<string, string>
    const photoMark = photoMarks.get(p.id) ?? new Map<string, boolean | null>()
    const tally = new Map<string, { right: number; total: number }>()
    for (const q of p.aiAssessment.questions) {
      let right: boolean
      if (q.type === 'written_work') {
        // Written work counts once it has been marked; a photo still waiting for the teacher says nothing yet.
        const mark = photoMark.get(q.id)
        if (mark === null || mark === undefined) continue
        right = mark
      } else {
        right = isCorrect(q.answer, answers[q.id] ?? '')
      }
      const t = tally.get(q.competency) ?? { right: 0, total: 0 }
      t.total++
      if (right) t.right++
      tally.set(q.competency, t)
    }
    for (const [name, t] of tally) add(p.studentId, { subject: p.aiAssessment.subject, name, percent: (t.right / t.total) * 100, at: p.completedAt! })
  }
  if (!byStudent.size) return

  // The topic catalogue, matched loosely by name; topics not in it yet are added.
  const catalogue = await prisma.competency.findMany()
  const known = new Map(catalogue.map((c) => [keyOf(c.subject, c.name), c.id]))
  let position = catalogue.reduce((max, c) => Math.max(max, c.position), 0)
  const competencyId = async (e: Evidence): Promise<string> => {
    const key = keyOf(e.subject, e.name)
    const found = known.get(key)
    if (found) return found
    const data = { name: e.name.trim(), topic: e.topic?.trim() || e.name.trim(), subject: e.subject.trim(), position: ++position }
    // Another request may have added it a moment ago: use that one.
    const made = await prisma.competency.create({ data }).catch(() => prisma.competency.findFirstOrThrow({ where: { subject: data.subject, name: data.name } }))
    known.set(key, made.id)
    return made.id
  }

  for (const [studentId, topics] of byStudent) {
    for (const evidence of topics.values()) {
      const recent = [...evidence].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, RECENT)
      const score = Math.min(100, Math.max(0, Math.round(recent.reduce((sum, e) => sum + e.percent, 0) / recent.length)))
      const id = await competencyId(recent[0]!)
      const values = { score, level: levelFromScore(score) }
      await prisma.competencyScore.upsert({ where: { studentId_competencyId: { studentId, competencyId: id } }, create: { studentId, competencyId: id, ...values }, update: values })
    }
  }
}

/**
 * Catches up students whose work was entered before mastery was worked out from it: those with results, an exam
 * analysis or finished practice, but no mastery recorded at all. Run once when the server starts.
 */
export async function backfillMastery(): Promise<number> {
  const students = await prisma.student.findMany({
    where: {
      competencyScores: { none: {} },
      OR: [{ diagnostics: { some: {} } }, { results: { some: {} } }, { practice: { some: { completedAt: { not: null } } } }],
    },
    select: { id: true },
    take: 500,
  })
  await recomputeMastery(students.map((s) => s.id))
  return students.length
}
