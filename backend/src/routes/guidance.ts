import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireRole, requireUser } from '../auth/session.ts'
import { prisma } from '../db/client.ts'
import { notifyParents } from '../messaging/messages.ts'
import { Prisma } from '../generated/prisma/client.ts'
import { studentScope } from './access.ts'
import { toGuidancePlan, type PlanEdits } from './mappers.ts'

const teacherOrAdmin = { onRequest: requireRole('teacher', 'admin') }
const StatusSchema = z.enum(['pending_review', 'approved', 'revision_requested', 'overridden'])

// A teacher's decision and/or edits on a plan — the same as GuidanceReviewContext's decide(), saveEdits() and reset().
// `edits: null` clears the teacher's edits; `note: null` clears the note.
const DecisionSchema = z
  .object({
    status: StatusSchema.optional(),
    note: z.string().max(2000).nullable().optional(),
    edits: z
      .object({
        method: z.string().max(200).optional(),
        rationale: z.string().max(2000).optional(),
        pacing: z.string().max(500).optional(),
        practice: z.array(z.string().max(300)).max(20).optional(),
      })
      .nullable()
      .optional(),
  })
  .refine((d) => d.status !== undefined || d.note !== undefined || d.edits !== undefined, { message: 'Send a status, a note or edits.' })

export async function guidanceRoutes(app: FastifyInstance) {
  // Plans for the user's students, newest first. Optional ?studentId= and ?status=. Replaces data/guidance.ts.
  // Parents and students only ever see plans a teacher has approved.
  app.get<{ Querystring: { studentId?: string; status?: string } }>('/guidance', { onRequest: requireUser }, async (request, reply) => {
    const user = request.user!
    const status = request.query.status === undefined ? undefined : StatusSchema.safeParse(request.query.status)
    if (status && !status.success) return reply.code(400).send({ error: 'Unknown status.' })
    const staff = user.role === 'teacher' || user.role === 'admin'
    const plans = await prisma.guidancePlan.findMany({
      where: {
        student: studentScope(user),
        ...(request.query.studentId ? { studentId: request.query.studentId } : {}),
        ...(staff ? (status ? { status: status.data } : {}) : { status: 'approved' }),
      },
      orderBy: { createdAt: 'desc' },
    })
    return plans.map(toGuidancePlan)
  })

  // Approve, request revision or override a plan, save edits, or reset it to "Awaiting review". Replaces GuidanceReviewContext.
  app.patch<{ Params: { id: string } }>('/guidance/:id', teacherOrAdmin, async (request, reply) => {
    const parsed = DecisionSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid decision', issues: parsed.error.issues })
    const user = request.user!
    const plan = await prisma.guidancePlan.findFirst({ where: { id: request.params.id, student: studentScope(user) } })
    if (!plan) return reply.code(404).send({ error: 'Plan not found.' })

    const { status, note, edits } = parsed.data
    const resetting = status === 'pending_review'
    const updated = await prisma.guidancePlan.update({
      where: { id: plan.id },
      data: {
        ...(status ? (resetting ? { status, decidedById: null, decidedAt: null } : { status, decidedById: user.sub, decidedAt: new Date() }) : {}),
        ...(note !== undefined ? { teacherNote: note } : {}),
        ...(edits === null ? { edits: Prisma.DbNull } : edits ? { edits: { ...((plan.edits ?? {}) as PlanEdits), ...edits } } : {}),
      },
    })
    // Once approved, the plan's home-support note goes to the child's parents (app, email and SMS).
    if (status === 'approved' && plan.status !== 'approved') {
      const parentNote = (plan.plan as { outputs?: { parentNote?: string } }).outputs?.parentNote?.trim()
      if (parentNote) {
        void notifyParents([plan.studentId], { title: 'a new home-support plan', focus: plan.competencyGap, note: parentNote })
          .catch((error) => request.log.error(error, 'parent updates failed'))
      }
    }
    return toGuidancePlan(updated)
  })
}
