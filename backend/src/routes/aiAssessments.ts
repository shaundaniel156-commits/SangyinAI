import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireRole, requireUser } from '../auth/session.ts'
import { prisma } from '../db/client.ts'
import { notifyParents, notifyUsers } from '../messaging/messages.ts'
import type { Prisma } from '../generated/prisma/client.ts'
import { aiAssessmentScope, classScope, studentScope } from './access.ts'
import { aiAssessmentInclude, toAiAssessment } from './mappers.ts'

const teacherOrAdmin = { onRequest: requireRole('teacher', 'admin') }

const QuestionSchema = z.object({
  sourceId: z.string().min(1),
  competency: z.string().min(1),
  type: z.enum(['multiple_choice', 'short_answer']),
  difficulty: z.enum(['foundation', 'core', 'stretch']),
  prompt: z.string().min(1).max(2000),
  options: z.array(z.string().max(500)).max(6).optional(),
  answer: z.string().max(1000),
  explanation: z.string().max(2000),
})

// The fields a teacher can change on a draft during review (no defaults, so a change touches only what is sent).
const EditableFields = z.object({
  title: z.string().trim().min(1).max(200),
  subject: z.string().min(1).max(60),
  competencies: z.array(z.string().min(1)).min(1).max(10),
  studentIds: z.array(z.string().min(1)).max(200),
  questions: z.array(QuestionSchema).min(1).max(30),
  difficulty: z.enum(['foundation', 'core', 'stretch', 'mixed']),
  dueDate: z.union([z.iso.date(), z.literal('')]),
  messageToStudents: z.string().max(2000),
  reportNotes: z.string().max(4000),
  rationale: z.array(z.string().max(1000)).max(10),
  curriculumRefs: z.array(z.string().max(500)).max(20),
  parentNote: z.string().max(2000),
  shareWithParents: z.boolean(),
})
const EditSchema = EditableFields.partial()

// The frontend's AiDraft (an AiAssessment without id, createdOn, status, sentOn), plus where it came from.
const DraftSchema = EditableFields.extend({
  classId: z.string().min(1),
  dueDate: EditableFields.shape.dueDate.default(''),
  reportNotes: EditableFields.shape.reportNotes.default(''),
  rationale: EditableFields.shape.rationale.default([]),
  curriculumRefs: EditableFields.shape.curriculumRefs.default([]),
  parentNote: EditableFields.shape.parentNote.optional(),
  shareWithParents: EditableFields.shape.shareWithParents.default(true),
  source: z.enum(['gemini', 'offline']).optional(),
  // The anonymous request sent to the AI (no student names), kept for fine-tuning.
  requestSent: z.record(z.string(), z.unknown()).optional(),
})

const questionRows = (questions: z.infer<typeof QuestionSchema>[]) =>
  questions.map((q, i) => ({ ...q, position: i, options: q.type === 'multiple_choice' ? q.options ?? [] : [] }))

// Each student's result on a sent assessment (frontend AttemptResult), keyed by student id.
function attemptsByStudent(assignments: { studentId: string; score: number | null; completedAt: Date | null }[], total: number) {
  return Object.fromEntries(assignments.filter((p) => p.completedAt).map((p) => [p.studentId, { score: p.score ?? 0, total, completedOn: p.completedAt!.toISOString() }]))
}

// The students must all be in the assessment's class.
async function studentsOutsideClass(classId: string, studentIds: string[]) {
  const inClass = new Set((await prisma.student.findMany({ where: { classId, id: { in: studentIds } }, select: { id: true } })).map((s) => s.id))
  return studentIds.filter((id) => !inClass.has(id))
}

export async function aiAssessmentRoutes(app: FastifyInstance) {
  // Replaces AiAssessmentsContext's list. Newest first.
  // - Teachers: their drafts and sent assessments (admins: the school's), with each student's result once they have answered.
  // - Students: assessments sent to them — without answers — with their own practice copy (practiceId) and result.
  // - Parents: assessments sent to their children that the teacher shared with parents (for the parent note).
  app.get('/ai/assessments', { onRequest: requireUser }, async (request) => {
    const user = request.user!
    if (user.role === 'teacher' || user.role === 'admin') {
      const items = await prisma.aiAssessment.findMany({
        // Only drafts made with the AI Assessment Builder (they have a source); seeded sample practice isn't listed here.
        where: { ...aiAssessmentScope(user), source: { not: null } },
        include: { ...aiAssessmentInclude, assignments: { where: { completedAt: { not: null } } } },
        orderBy: { createdAt: 'desc' },
      })
      return items.map((a) => ({ ...toAiAssessment(a), attempts: attemptsByStudent(a.assignments, a.questions.length) }))
    }

    const myStudents = (await prisma.student.findMany({ where: studentScope(user), select: { id: true } })).map((s) => s.id)
    const items = await prisma.aiAssessment.findMany({
      // Only assessments drafted with the AI Assessment Builder (they have a source); sample practice comes from /me/practice.
      where: { status: 'sent', source: { not: null }, studentIds: { hasSome: myStudents }, ...(user.role === 'parent' ? { shareWithParents: true } : {}) },
      include: { ...aiAssessmentInclude, assignments: { where: { studentId: { in: myStudents } } } },
      orderBy: { sentAt: 'desc' },
    })
    return items.map((a) => {
      const full = toAiAssessment(a)
      const studentIds = a.studentIds.filter((id) => myStudents.includes(id))
      if (user.role === 'parent') return { ...full, studentIds, questions: [] }
      const mine = a.assignments[0]
      return {
        ...full,
        studentIds,
        questions: full.questions.map(({ answer: _answer, explanation: _explanation, ...q }) => ({ ...q, answer: '', explanation: '' })),
        ...(mine ? { practiceId: mine.id } : {}),
        ...(mine?.completedAt ? { attempt: { score: mine.score ?? 0, total: a.questions.length, completedOn: mine.completedAt.toISOString() } } : {}),
      }
    })
  })

  // Save a new draft (after "Generate draft"). Nothing reaches students until it is sent.
  app.post('/ai/assessments', teacherOrAdmin, async (request, reply) => {
    const parsed = DraftSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid draft', issues: parsed.error.issues })
    const user = request.user!
    const { questions, dueDate, requestSent, ...rest } = parsed.data
    if (!(await prisma.schoolClass.count({ where: { id: rest.classId, ...classScope(user) } }))) return reply.code(404).send({ error: 'Class not found.' })
    const outside = await studentsOutsideClass(rest.classId, rest.studentIds)
    if (outside.length) return reply.code(400).send({ error: 'Some students are not in this class.', studentIds: outside })

    const created = await prisma.aiAssessment.create({
      data: {
        ...rest,
        createdById: user.sub,
        dueDate: dueDate ? new Date(dueDate) : null,
        ...(requestSent ? { requestSent: requestSent as Prisma.InputJsonValue } : {}),
        questions: { create: questionRows(questions) },
      },
      include: aiAssessmentInclude,
    })
    return reply.code(201).send(toAiAssessment(created))
  })

  // Change a draft during review. Sending `questions` replaces the whole list. Sent assessments can't be changed.
  app.patch<{ Params: { id: string } }>('/ai/assessments/:id', teacherOrAdmin, async (request, reply) => {
    const parsed = EditSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid change', issues: parsed.error.issues })
    const item = await prisma.aiAssessment.findFirst({ where: { id: request.params.id, ...aiAssessmentScope(request.user!) } })
    if (!item) return reply.code(404).send({ error: 'Assessment not found.' })
    if (item.status !== 'draft') return reply.code(409).send({ error: 'This assessment has already been sent and can no longer be changed.' })

    const { questions, dueDate, ...rest } = parsed.data
    if (rest.studentIds) {
      const outside = await studentsOutsideClass(item.classId, rest.studentIds)
      if (outside.length) return reply.code(400).send({ error: 'Some students are not in this class.', studentIds: outside })
    }
    const updated = await prisma.aiAssessment.update({
      where: { id: item.id },
      data: {
        ...rest,
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(questions ? { questions: { deleteMany: {}, create: questionRows(questions) } } : {}),
      },
      include: aiAssessmentInclude,
    })
    return toAiAssessment(updated)
  })

  // Discard a draft.
  app.delete<{ Params: { id: string } }>('/ai/assessments/:id', teacherOrAdmin, async (request, reply) => {
    const item = await prisma.aiAssessment.findFirst({ where: { id: request.params.id, ...aiAssessmentScope(request.user!) } })
    if (!item) return reply.code(404).send({ error: 'Assessment not found.' })
    if (item.status !== 'draft') return reply.code(409).send({ error: 'Sent assessments are kept so students keep their results.' })
    await prisma.aiAssessment.delete({ where: { id: item.id } })
    return reply.code(204).send()
  })

  // "Approve & send": gives each chosen student their copy, keeps the approved draft as a fine-tuning example
  // (when the AI request is known), and tells students who have a login.
  app.post<{ Params: { id: string } }>('/ai/assessments/:id/send', teacherOrAdmin, async (request, reply) => {
    const item = await prisma.aiAssessment.findFirst({ where: { id: request.params.id, ...aiAssessmentScope(request.user!) }, include: aiAssessmentInclude })
    if (!item) return reply.code(404).send({ error: 'Assessment not found.' })
    if (item.status !== 'draft') return reply.code(409).send({ error: 'This assessment has already been sent.' })
    if (!item.studentIds.length) return reply.code(400).send({ error: 'Choose at least one student before sending.' })

    const studentLogins = await prisma.student.findMany({ where: { id: { in: item.studentIds }, userId: { not: null } }, select: { userId: true } })
    const approved = { title: item.title, messageToStudents: item.messageToStudents, parentNote: item.parentNote ?? '', rationale: item.rationale, questions: item.questions.map(({ competency, type, difficulty, prompt, options, answer, explanation }) => ({ competency, type, difficulty, prompt, options, answer, explanation })) }

    const [sent] = await prisma.$transaction([
      prisma.aiAssessment.update({ where: { id: item.id }, data: { status: 'sent', sentAt: new Date() }, include: aiAssessmentInclude }),
      prisma.practiceAssignment.createMany({ data: item.studentIds.map((studentId) => ({ aiAssessmentId: item.id, studentId })), skipDuplicates: true }),
      ...(item.requestSent ? [prisma.trainingExample.create({ data: { task: 'assessment', request: item.requestSent as Prisma.InputJsonValue, approved } })] : []),
    ])
    // Tell students (in the app, plus an email copy) and, if shared, their parents (app, email and SMS). Failures are logged and never block the send.
    void notifyUsers(studentLogins.map((s) => s.userId!), { kind: 'practice_update', title: 'New practice ready', body: `“${item.title}” has been added to your practice list.`, link: '/student/practice' })
      .catch((error) => request.log.error(error, 'student notifications failed'))
    if (item.shareWithParents && item.parentNote?.trim()) {
      void notifyParents(item.studentIds, { title: 'new practice from school', focus: item.competencies.slice(0, 2).join(' and ') || item.subject, note: item.parentNote.trim() })
        .catch((error) => request.log.error(error, 'parent updates failed'))
    }
    return toAiAssessment(sent)
  })
}
