import type { FastifyInstance, FastifyRequest } from 'fastify'
import { diagnoseExam, ExamDiagnosisRequestSchema } from '../ai/examDiagnosis.ts'
import { requireRole, requireUser } from '../auth/session.ts'
import { prisma } from '../db/client.ts'
import { studentScope } from './access.ts'
import { byName, studentInclude, toDiagnostic, toStudent } from './mappers.ts'
import { recomputeMastery } from './mastery.ts'

export async function studentRoutes(app: FastifyInstance) {
  // Every student the user may see: a teacher's classes, an admin's school, a parent's children, or the student themselves.
  // Replaces STUDENTS in data/students.ts.
  app.get('/students', { onRequest: requireUser }, async (request) => {
    const students = await prisma.student.findMany({ where: studentScope(request.user!), include: studentInclude })
    return students.sort(byName).map(toStudent)
  })

  // One student's profile: for their teachers, an admin, a linked parent, or the student themselves.
  app.get<{ Params: { id: string } }>('/students/:id', { onRequest: requireUser }, async (request, reply) => {
    const student = await prisma.student.findFirst({ where: { id: request.params.id, ...studentScope(request.user!) }, include: studentInclude })
    if (!student) return reply.code(404).send({ error: 'Student not found.' })
    return toStudent(student)
  })

  // Diagnostic reports for the students the user may see, each with the id of the student's latest guidance plan.
  // Replaces DIAGNOSTIC_REPORTS in data/diagnostics.ts.
  app.get('/diagnostics', { onRequest: requireUser }, async (request) => {
    const reports = await prisma.diagnosticReport.findMany({
      where: { student: studentScope(request.user!) },
      include: { student: { select: { guidancePlans: { select: { id: true }, orderBy: { createdAt: 'desc' }, take: 1 } } } },
      orderBy: { generatedAt: 'desc' },
    })
    return reports.map((r) => toDiagnostic(r, r.student.guidancePlans[0]?.id))
  })

  // Analyse exam results: a teacher enters one student's marks per topic and/or the written report, and the AI
  // (or, without it, the marks alone) diagnoses the competency gaps. Saved as a diagnostic report.
  app.post(
    '/diagnostics',
    {
      onRequest: requireRole('teacher', 'admin'),
      // Room for an uploaded document of up to 10 MB (sent as base64, about a third larger).
      bodyLimit: 15 * 1024 * 1024,
      config: { rateLimit: { max: 20, timeWindow: '1 hour', hook: 'preHandler' as const, keyGenerator: (request: FastifyRequest) => request.user?.sub ?? request.ip } },
    },
    async (request, reply) => {
      const parsed = ExamDiagnosisRequestSchema.safeParse(request.body)
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Check the details and try again.' })
      const r = parsed.data
      const student = await prisma.student.findFirst({ where: { id: r.studentId, ...studentScope(request.user!) }, include: { class: true } })
      if (!student) return reply.code(404).send({ error: 'Student not found in your classes.' })

      let result
      try {
        result = await diagnoseExam(r, { classLevel: student.class.level, framework: student.class.framework, schoolId: request.user!.schoolId })
      } catch (error) {
        request.log.warn(error, 'exam diagnosis: unreadable document')
        return reply.code(400).send({ error: 'That document could not be read. Try a PDF or a clear photo instead.' })
      }
      if (!result) return reply.code(503).send({ error: 'The AI is not available right now, so the document or report could not be read. Enter the marks for each topic so the gaps can be worked out from them, or try again later.' })

      const { diagnosis, source } = result
      const names = (level: string) => diagnosis.competencies.filter((c) => c.level === level).map((c) => c.name)
      const summary = {
        overview: diagnosis.overview,
        nextSteps: diagnosis.nextSteps,
        identifiedAreas: [...names('needs_support'), ...names('developing')],
        strengths: names('strength'),
        developing: names('developing'),
        needsSupport: names('needs_support'),
        competencies: diagnosis.competencies.map((c, i) => ({ competencyId: `exam-${i + 1}`, name: c.name, topic: c.topic, subject: r.subject, score: c.score, level: c.level })),
        evidence: [
          ...r.items.map((i) => {
            const pct = (i.score / i.outOf) * 100
            return { assessmentTitle: r.examTitle, item: `${i.topic}: ${i.score} / ${i.outOf}`, outcome: pct >= 70 ? 'correct' : pct >= 40 ? 'partial' : 'incorrect' }
          }),
        ],
        processing: source === 'gemini' ? 'refined' : 'local',
        basis: 'exam',
      }
      const report = await prisma.diagnosticReport.create({ data: { studentId: student.id, subject: r.subject, summary } })
      // The diagnosis becomes the student's mastery of these topics: their profile, "needs support", the class's gaps.
      await recomputeMastery([student.id]).catch((error) => request.log.error(error, 'mastery not updated after exam analysis'))
      return reply.code(201).send(toDiagnostic(report))
    },
  )
}
