import type { FastifyInstance } from 'fastify'
import { requireUser } from '../auth/session.ts'
import { prisma } from '../db/client.ts'
import { studentScope } from './access.ts'
import { byName, studentInclude, toDiagnostic, toStudent } from './mappers.ts'

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
}
