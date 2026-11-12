import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { SessionUser } from '../auth/session.ts'
import { requireRole, requireUser } from '../auth/session.ts'
import { markWrittenWork } from '../ai/markWork.ts'
import { prisma } from '../db/client.ts'
import { studentScope } from './access.ts'
import { isCorrect } from './marking.ts'
import { recomputeMastery } from './mastery.ts'
import { practiceInclude, toPracticeActivity } from './mappers.ts'

const studentOnly = { onRequest: requireRole('student') }

// A photo of work done on paper, for a written_work question (shrunk in the browser; at most 4 MB each as base64).
const WorkSchema = z.object({ mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']), data: z.string().min(1).max(5_600_000) })
const AnswersSchema = z.object({
  answers: z.record(z.string(), z.string().max(1000)),
  // Keyed by question id, like answers.
  work: z.record(z.string(), WorkSchema).refine((w) => Object.keys(w).length <= 15, { message: 'At most 15 photos' }).optional(),
  feedback: z.enum(['easy', 'okay', 'difficult']).optional(),
})
const FeedbackSchema = z
  .object({ feedback: z.enum(['easy', 'okay', 'difficult']).optional(), confidence: z.enum(['confident', 'unsure', 'need_help']).optional() })
  .refine((f) => f.feedback || f.confidence, { message: 'Nothing to save' })
// The photos make this request far bigger than the server's usual limit.
const answersOptions = { onRequest: requireRole('student'), bodyLimit: 40 * 1024 * 1024 }

// Thrown inside the hand-in transaction when a once-only assessment was handed in by another request first.
const doneAlready = new Error('done already')

// The signed-in student's own practice copy, or null.
async function findOwnAssignment(user: SessionUser, id: string) {
  return prisma.practiceAssignment.findFirst({
    where: { id, student: { userId: user.sub, schoolId: user.schoolId }, aiAssessment: { status: 'sent' } },
    include: { aiAssessment: { include: { questions: { orderBy: { position: 'asc' } }, class: { select: { level: true } }, assessment: { select: { id: true, maxScore: true } } } } },
  })
}

export async function practiceRoutes(app: FastifyInstance) {
  // The signed-in student's practice list. Replaces PRACTICE_ACTIVITIES in data/practice.ts.
  // Assessments drafted with the AI Assessment Builder are listed by /ai/assessments instead ("From your teacher"), so they aren't shown twice.
  app.get('/me/practice', studentOnly, async (request) => {
    const user = request.user!
    const items = await prisma.practiceAssignment.findMany({
      where: { student: { userId: user.sub, schoolId: user.schoolId }, aiAssessment: { status: 'sent', source: null } },
      include: practiceInclude,
      orderBy: { aiAssessment: { sentAt: 'desc' } },
    })
    return items.map(toPracticeActivity)
  })

  // A child's practice list, for their parent (or teachers): everything sent to the child, including assessments
  // from the AI Assessment Builder (title, subject, due date, how many questions, done or not, score), with no questions.
  app.get<{ Params: { id: string } }>('/students/:id/practice', { onRequest: requireUser }, async (request, reply) => {
    const student = await prisma.student.findFirst({ where: { id: request.params.id, ...studentScope(request.user!) }, select: { id: true } })
    if (!student) return reply.code(404).send({ error: 'Student not found.' })
    const items = await prisma.practiceAssignment.findMany({
      where: { studentId: student.id, aiAssessment: { status: 'sent' } },
      include: practiceInclude,
      orderBy: { aiAssessment: { sentAt: 'desc' } },
    })
    return items.map(toPracticeActivity)
  })

  // "How difficult was this activity?" and "How confident do you feel?" on the student's Feedback page: saved on
  // their own copy, where the teacher sees it beside the result (AI Assessment Builder, the assessment's recipients).
  app.patch<{ Params: { id: string } }>('/practice/:id/feedback', studentOnly, async (request, reply) => {
    const parsed = FeedbackSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Choose an answer first.' })
    const user = request.user!
    const item = await prisma.practiceAssignment.findFirst({ where: { id: request.params.id, student: { userId: user.sub, schoolId: user.schoolId } }, select: { id: true } })
    if (!item) return reply.code(404).send({ error: 'Practice not found.' })
    const saved = await prisma.practiceAssignment.update({ where: { id: item.id }, data: parsed.data, select: { feedback: true, confidence: true } })
    return { feedback: saved.feedback, confidence: saved.confidence }
  })

  // One practice to take: the teacher's message and the questions, without the answers (those come back after marking).
  app.get<{ Params: { id: string } }>('/practice/:id', studentOnly, async (request, reply) => {
    const item = await findOwnAssignment(request.user!, request.params.id)
    if (!item) return reply.code(404).send({ error: 'Practice not found.' })
    if (item.status === 'not_started') await prisma.practiceAssignment.update({ where: { id: item.id }, data: { status: 'in_progress', startedAt: new Date() } })
    const a = item.aiAssessment
    return {
      id: item.id,
      title: a.title,
      subject: a.subject,
      messageToStudents: a.messageToStudents,
      status: item.status === 'not_started' ? 'in_progress' : item.status,
      questions: a.questions.map((q) => ({ id: q.id, competency: q.competency, type: q.type, difficulty: q.difficulty, prompt: q.prompt, ...(q.type === 'multiple_choice' ? { options: q.options } : {}) })),
    }
  })

  // "Check my answers": marks on the server, saves the result, and returns the score with each answer and explanation
  // (the frontend's AttemptResult plus per-question marking). Written work arrives as photos: the AI marks each
  // against the model answer and writes feedback; if it can't, the photo is kept for the teacher to read (pending).
  app.post<{ Params: { id: string } }>('/practice/:id/answers', answersOptions, async (request, reply) => {
    const parsed = AnswersSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid answers', issues: parsed.error.issues })
    const item = await findOwnAssignment(request.user!, request.params.id)
    if (!item) return reply.code(404).send({ error: 'Practice not found.' })
    // A formal assessment is done once; practice can be tried again.
    const alreadyDone = { error: 'You have already done this assessment. Your result is saved.' }
    if (item.aiAssessment.oneAttempt && item.completedAt) return reply.code(409).send(alreadyDone)

    const questions = item.aiAssessment.questions
    const work = parsed.data.work ?? {}
    const uploaded = questions.filter((q) => q.type === 'written_work' && work[q.id])
    const marks = await markWrittenWork(
      uploaded.map((q) => ({ prompt: q.prompt, answer: q.answer, explanation: q.explanation, competency: q.competency, ...work[q.id]! })),
      { subject: item.aiAssessment.subject, classLevel: item.aiAssessment.class.level },
    )
    const markOf = new Map(uploaded.map((q, i) => [q.id, marks[i] ?? null]))

    const answers = { ...parsed.data.answers, ...Object.fromEntries(uploaded.map((q) => [q.id, 'photo'])) }
    const marked = questions.map((q) => {
      const given = answers[q.id] ?? ''
      if (q.type !== 'written_work') return { id: q.id, given, correct: isCorrect(q.answer, given, q.type === 'multiple_choice' ? q.options : null), answer: q.answer, explanation: q.explanation }
      const mark = markOf.get(q.id)
      return { id: q.id, given, correct: mark?.correct ?? false, answer: q.answer, explanation: q.explanation, ...(mark ? { feedback: mark.feedback } : {}), pending: Boolean(work[q.id]) && !mark }
    })
    const score = marked.filter((m) => m.correct).length
    const completedAt = new Date()
    // Marked, the whole result is written in one step. For a once-only assessment that update only matches a copy
    // not yet done, so of two hand-ins arriving together only the first is saved; the second is refused and writes
    // nothing (not even its photos). Until then the copy is untouched, so nothing shows it as done early.
    try {
      await prisma.$transaction(async (tx) => {
        const saved = await tx.practiceAssignment.updateMany({
          where: { id: item.id, ...(item.aiAssessment.oneAttempt ? { completedAt: null } : {}) },
          data: { status: 'completed', answers, score, completedAt, startedAt: item.startedAt ?? completedAt, ...(parsed.data.feedback ? { feedback: parsed.data.feedback } : {}) },
        })
        if (!saved.count) throw doneAlready
        for (const q of uploaded) {
          const mark = markOf.get(q.id)
          const fields = { mimeType: work[q.id]!.mimeType, data: Buffer.from(work[q.id]!.data, 'base64'), correct: mark?.correct ?? null, feedback: mark?.feedback ?? '' }
          await tx.practiceUpload.upsert({ where: { assignmentId_questionId: { assignmentId: item.id, questionId: q.id } }, create: { assignmentId: item.id, questionId: q.id, ...fields }, update: fields })
        }
      // The photos can run to a few MB each; a slow database must not fail a hand-in the AI has already marked.
      }, { timeout: 60_000 })
    } catch (error) {
      if (error === doneAlready) return reply.code(409).send(alreadyDone)
      throw error
    }
    // The score goes into the gradebook (Assessments) out of that assessment's maximum, and the assessment is
    // complete once every student it was sent to has done it. Never allowed to fail the student's submission.
    const graded = item.aiAssessment.assessment
    if (graded && questions.length) {
      try {
        const mark = Math.round((score / questions.length) * graded.maxScore * 10) / 10
        const remark = marked.some((m) => 'pending' in m && m.pending) ? 'Written work is waiting to be marked' : null
        await prisma.assessmentResult.upsert({
          where: { assessmentId_studentId: { assessmentId: graded.id, studentId: item.studentId } },
          update: { score: mark, remark },
          create: { assessmentId: graded.id, studentId: item.studentId, score: mark, remark },
        })
        const entered = await prisma.assessmentResult.count({ where: { assessmentId: graded.id } })
        await prisma.assessment.update({ where: { id: graded.id }, data: { status: entered >= item.aiAssessment.studentIds.length ? 'completed' : 'awaiting_scores' } })
      } catch (error) {
        request.log.error(error, 'score not entered in the gradebook')
      }
    }

    // The result counts towards the student's mastery of these topics (their profile, the class's gaps, the reports).
    await recomputeMastery([item.studentId]).catch((error) => request.log.error(error, 'mastery not updated after practice'))
    return { score, total: questions.length, completedOn: completedAt.toISOString(), questions: marked }
  })
}
