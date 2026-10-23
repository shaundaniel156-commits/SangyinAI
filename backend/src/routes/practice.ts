import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { SessionUser } from '../auth/session.ts'
import { requireRole, requireUser } from '../auth/session.ts'
import { prisma } from '../db/client.ts'
import { studentScope } from './access.ts'
import { practiceInclude, toPracticeActivity } from './mappers.ts'

const studentOnly = { onRequest: requireRole('student') }

const AnswersSchema = z.object({
  answers: z.record(z.string(), z.string().max(1000)),
  feedback: z.enum(['easy', 'okay', 'difficult']).optional(),
})

// Marking rules from the frontend's TakeAssessmentModal: ignore case, spaces, commas and full stops;
// "a / b" accepts either; open-ended items ("Answers will vary") count as done when attempted.
const normalise = (s: string) => s.toLowerCase().replace(/[\s,.]/g, '')
function isCorrect(answer: string, given: string): boolean {
  if (!given.trim()) return false
  if (answer === 'Answers will vary') return true
  return answer.split('/').some((a) => normalise(a) === normalise(given)) || normalise(answer) === normalise(given)
}

// The signed-in student's own practice copy, or null.
async function findOwnAssignment(user: SessionUser, id: string) {
  return prisma.practiceAssignment.findFirst({
    where: { id, student: { userId: user.sub, schoolId: user.schoolId }, aiAssessment: { status: 'sent' } },
    include: { aiAssessment: { include: { questions: { orderBy: { position: 'asc' } } } } },
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

  // A child's practice list, for their parent (or teachers). Same items as /me/practice.
  app.get<{ Params: { id: string } }>('/students/:id/practice', { onRequest: requireUser }, async (request, reply) => {
    const student = await prisma.student.findFirst({ where: { id: request.params.id, ...studentScope(request.user!) }, select: { id: true } })
    if (!student) return reply.code(404).send({ error: 'Student not found.' })
    const items = await prisma.practiceAssignment.findMany({
      where: { studentId: student.id, aiAssessment: { status: 'sent', source: null } },
      include: practiceInclude,
      orderBy: { aiAssessment: { sentAt: 'desc' } },
    })
    return items.map(toPracticeActivity)
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
  // (the frontend's AttemptResult plus per-question marking).
  app.post<{ Params: { id: string } }>('/practice/:id/answers', studentOnly, async (request, reply) => {
    const parsed = AnswersSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid answers', issues: parsed.error.issues })
    const item = await findOwnAssignment(request.user!, request.params.id)
    if (!item) return reply.code(404).send({ error: 'Practice not found.' })

    const questions = item.aiAssessment.questions
    const marked = questions.map((q) => {
      const given = parsed.data.answers[q.id] ?? ''
      return { id: q.id, given, correct: isCorrect(q.answer, given), answer: q.answer, explanation: q.explanation }
    })
    const score = marked.filter((m) => m.correct).length
    const completedAt = new Date()
    await prisma.practiceAssignment.update({
      where: { id: item.id },
      data: { status: 'completed', answers: parsed.data.answers, score, completedAt, startedAt: item.startedAt ?? completedAt, ...(parsed.data.feedback ? { feedback: parsed.data.feedback } : {}) },
    })
    return { score, total: questions.length, completedOn: completedAt.toISOString(), questions: marked }
  })
}
