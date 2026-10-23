import type { FastifyInstance } from 'fastify'
import { requireRole, requireUser } from '../auth/session.ts'
import { prisma } from '../db/client.ts'
import { classScope, studentScope } from './access.ts'
import { byName, classInclude, studentInclude, toSchoolClass, toStudent } from './mappers.ts'

export async function classRoutes(app: FastifyInstance) {
  // A teacher sees the classes they lead or teach; an admin sees every class in the school; parents and students
  // see their child's / their own class (class summaries only). Replaces data/classes.ts.
  app.get('/classes', { onRequest: requireUser }, async (request) => {
    const user = request.user!
    const staff = user.role === 'teacher' || user.role === 'admin'
    const classes = await prisma.schoolClass.findMany({ where: staff ? classScope(user) : { students: { some: studentScope(user) } }, include: classInclude })
    return classes.sort(byName).map(toSchoolClass)
  })

  // The students in one class. Replaces getStudentsByClass in data/students.ts.
  app.get<{ Params: { id: string } }>('/classes/:id/students', { onRequest: requireRole('teacher', 'admin') }, async (request, reply) => {
    const user = request.user!
    const found = await prisma.schoolClass.count({ where: { id: request.params.id, ...classScope(user) } })
    if (!found) return reply.code(404).send({ error: 'Class not found.' })
    const students = await prisma.student.findMany({ where: { classId: request.params.id, ...studentScope(user) }, include: studentInclude })
    return students.sort(byName).map(toStudent)
  })
}
