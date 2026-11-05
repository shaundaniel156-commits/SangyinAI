import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { generateGuidance } from '../ai/guidance.ts'
import { frameworkName } from '../ai/institution.ts'
import { requireRole, requireUser } from '../auth/session.ts'
import { prisma } from '../db/client.ts'
import { notifyParents, notifyUsers } from '../messaging/messages.ts'
import { Prisma } from '../generated/prisma/client.ts'
import { studentScope } from './access.ts'
import { toGuidancePlan, type PlanEdits } from './mappers.ts'

const teacherOrAdmin = { onRequest: requireRole('teacher', 'admin') }
// Routes that ask the AI: counted per teacher, after the sign-in check has identified them.
const aiRoute = {
  onRequest: requireRole('teacher', 'admin'),
  config: { rateLimit: { max: 60, timeWindow: '1 hour', hook: 'preHandler' as const, keyGenerator: (request: FastifyRequest) => request.user?.sub ?? request.ip } },
}
const StatusSchema = z.enum(['pending_review', 'approved', 'revision_requested', 'overridden'])
// A step of the plan as a teacher may edit it (the teaching steps, or the learner's guide).
const StepSchema = z.object({ title: z.string().max(200), detail: z.string().max(2000), minutes: z.number().int().min(1).max(120).optional(), example: z.string().max(1000).optional(), check: z.string().max(1000).optional() })

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
        sequence: z.array(StepSchema).max(10).optional(),
        parentNote: z.string().max(2000).optional(),
        studentSequence: z.array(z.string().max(300)).max(10).optional(),
        studentGuide: z.array(StepSchema).max(10).optional(),
      })
      .nullable()
      .optional(),
  })
  .refine((d) => d.status !== undefined || d.note !== undefined || d.edits !== undefined, { message: 'Send a status, a note or edits.' })

// again: also draft a new version for gaps that already have an approved plan (the teacher asked for a fresh draft).
const GenerateSchema = z.object({ studentId: z.string().min(1), subject: z.string().trim().min(1).max(60).optional(), again: z.boolean().optional() })
const RegenerateSchema = z.object({ note: z.string().trim().min(1).max(2000) })

// Each plan is one request to the AI, so a student gets plans for their weakest gaps first, this many at a time.
const MAX_GAPS = 2

interface Gap {
  name: string
  score: number
}

// A student's competency gaps in one subject, weakest first, with the evidence behind them (no names).
// From their latest diagnostic report (Analyse exam results) when there is one, otherwise their recorded mastery.
// Gaps that need support come first; only when there are none are the "developing" ones used.
async function gapsFor(studentId: string, subject?: string): Promise<{ subject: string; gaps: Gap[]; evidence: string[] } | null> {
  const report = await prisma.diagnosticReport.findFirst({ where: { studentId, ...(subject ? { subject } : {}) }, orderBy: { generatedAt: 'desc' } })
  if (report) {
    const s = report.summary as { competencies?: { name: string; score: number; level: string }[]; evidence?: { item: string; outcome: string }[]; overview?: string }
    const all = s.competencies ?? []
    const weak = all.filter((c) => c.level === 'needs_support')
    const gaps = (weak.length ? weak : all.filter((c) => c.level === 'developing')).sort((a, b) => a.score - b.score)
    return {
      subject: report.subject,
      gaps: gaps.map(({ name, score }) => ({ name, score })),
      evidence: [...(s.overview ? [s.overview] : []), ...(s.evidence ?? []).slice(0, 20).map((e) => `${e.item} — ${e.outcome}`)],
    }
  }
  const scores = await prisma.competencyScore.findMany({
    where: { studentId, level: { in: ['needs_support', 'developing'] }, ...(subject ? { competency: { subject } } : {}) },
    include: { competency: true },
    orderBy: { score: 'asc' },
  })
  if (!scores.length) return null
  const inSubject = subject ?? scores[0]!.competency.subject
  const mine = scores.filter((c) => c.competency.subject === inSubject)
  const weak = mine.filter((c) => c.level === 'needs_support')
  return {
    subject: inSubject,
    gaps: (weak.length ? weak : mine).map((c) => ({ name: c.competency.name, score: c.score })),
    evidence: mine.map((c) => `Recorded mastery in ${c.competency.name}: ${c.score}%`),
  }
}

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

  // The AI drafts guidance plans for one student's weakest gaps, for the teacher to review and edit. Gaps with no
  // plan come first; with `again`, gaps whose plan is already approved get a new draft too. A gap with a draft
  // already waiting is never drafted twice: those drafts come back as `waiting`. Returns the new plans, or none
  // with the reason.
  app.post('/guidance/generate', aiRoute, async (request, reply) => {
    const parsed = GenerateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Choose a student.' })
    const user = request.user!
    const student = await prisma.student.findFirst({ where: { id: parsed.data.studentId, ...studentScope(user) }, include: { class: true } })
    if (!student) return reply.code(404).send({ error: 'Student not found in your classes.' })

    const found = await gapsFor(student.id, parsed.data.subject)
    if (!found?.gaps.length) return { plans: [], reason: 'No competency gaps are recorded for this student yet. Analyse their exam results first.' }
    const existing = await prisma.guidancePlan.findMany({
      where: { studentId: student.id, subject: found.subject, status: { in: ['pending_review', 'approved'] } },
      orderBy: { createdAt: 'desc' },
    })
    const names = (status: string) => new Set(existing.filter((p) => p.status === status).map((p) => p.competencyGap.toLowerCase()))
    const [waitingFor, approvedFor] = [names('pending_review'), names('approved')]
    const open = found.gaps.filter((g) => !waitingFor.has(g.name.toLowerCase()))
    const fresh = open.filter((g) => !approvedFor.has(g.name.toLowerCase()))
    const gaps = (fresh.length ? fresh : parsed.data.again ? open : []).slice(0, MAX_GAPS)
    if (!gaps.length) {
      const waiting = existing.filter((p) => p.status === 'pending_review').map(toGuidancePlan)
      return { plans: [], waiting, reason: waiting.length ? 'A draft for this student is already waiting for your review.' : 'This student already has guidance for their current gaps.' }
    }

    const drafted = await Promise.all(
      gaps.map((g) =>
        generateGuidance(
          { classLevel: student.class.level, framework: student.class.framework, subject: found.subject, competencyGap: g.name, masteryPercent: Math.min(100, Math.max(0, g.score)), curriculumObjectives: [], evidence: found.evidence, studentFeedback: '' },
          user.schoolId,
        ),
      ),
    )
    const created = await prisma.$transaction(
      drafted.map(({ plan, source }, i) =>
        prisma.guidancePlan.create({
          data: { studentId: student.id, subject: found.subject, competencyGap: gaps[i]!.name, curriculumReference: `${frameworkName(student.class.framework)} · ${student.class.level} ${found.subject} · ${gaps[i]!.name}`, plan, source },
        }),
      ),
    )
    return reply.code(201).send({ plans: created.map(toGuidancePlan) })
  })

  // "Request revision": the AI rewrites the plan following the teacher's note. The new version replaces the old
  // one (and any edits to it) and goes back to "Awaiting review".
  app.post<{ Params: { id: string } }>('/guidance/:id/regenerate', aiRoute, async (request, reply) => {
    const parsed = RegenerateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Say what should change.' })
    const user = request.user!
    const plan = await prisma.guidancePlan.findFirst({ where: { id: request.params.id, student: studentScope(user) }, include: { student: { include: { class: true } } } })
    if (!plan) return reply.code(404).send({ error: 'Plan not found.' })

    const found = await gapsFor(plan.studentId, plan.subject)
    const gap = found?.gaps.find((g) => g.name.toLowerCase() === plan.competencyGap.toLowerCase())
    const current = toGuidancePlan(plan)
    const { plan: body, source } = await generateGuidance(
      {
        classLevel: plan.student.class.level,
        framework: plan.student.class.framework,
        subject: plan.subject,
        competencyGap: plan.competencyGap,
        masteryPercent: Math.min(100, Math.max(0, gap?.score ?? 40)),
        curriculumObjectives: [],
        evidence: found?.evidence ?? [],
        studentFeedback: '',
        teacherRequest: `${parsed.data.note}\nThe plan being replaced used "${current.teachingApproach.method}" with pacing "${current.pacing}".`,
      },
      user.schoolId,
    )
    if (source === 'offline') return reply.code(503).send({ error: 'The AI is not available right now, so the plan could not be rewritten. Try again in a few minutes, or edit the plan yourself.' })
    const updated = await prisma.guidancePlan.update({
      where: { id: plan.id },
      data: { plan: body, source, edits: Prisma.DbNull, status: 'pending_review', decidedById: null, decidedAt: null, teacherNote: `Rewritten at your request: ${parsed.data.note}` },
    })
    return toGuidancePlan(updated)
  })

  // Approve, request revision or override a plan, save edits, or reset it to "Awaiting review". Replaces GuidanceReviewContext.
  app.patch<{ Params: { id: string } }>('/guidance/:id', teacherOrAdmin, async (request, reply) => {
    const parsed = DecisionSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid decision', issues: parsed.error.issues })
    const user = request.user!
    const plan = await prisma.guidancePlan.findFirst({ where: { id: request.params.id, student: studentScope(user) }, include: { student: { select: { userId: true } } } })
    if (!plan) return reply.code(404).send({ error: 'Plan not found.' })

    const { status, note, edits } = parsed.data
    const resetting = status === 'pending_review'
    const updated = await prisma.guidancePlan.update({
      where: { id: plan.id },
      data: {
        ...(status ? (resetting ? { status, decidedById: null, decidedAt: null } : { status, decidedById: user.sub, decidedAt: new Date() }) : {}),
        ...(note !== undefined ? { teacherNote: note } : {}),
        ...(edits === null ? { edits: Prisma.DbNull } : edits ? { edits: { ...((plan.edits ?? {}) as PlanEdits), ...edits } as Prisma.InputJsonValue } : {}),
      },
    })
    // A newly approved plan replaces any older approved plan for the same gap, so the student sees one guide per gap.
    if (status === 'approved') {
      await prisma.guidancePlan.updateMany({
        where: { studentId: plan.studentId, subject: plan.subject, competencyGap: { equals: plan.competencyGap, mode: 'insensitive' }, status: 'approved', id: { not: plan.id } },
        data: { status: 'overridden', teacherNote: 'Replaced by a newer approved plan.' },
      })
    }
    const shared = toGuidancePlan(updated)
    // Once approved, the plan (as the teacher left it) is shared: its steps with the student, and its home-support
    // note with the child's parents (app, email and SMS). Failures are logged and never block the approval.
    if (status === 'approved' && plan.status !== 'approved') {
      if (plan.student.userId) {
        void notifyUsers([plan.student.userId], { kind: 'practice_update', title: 'A learning plan from your teacher', body: `Your teacher has shared steps to help you with ${plan.competencyGap}.`, link: '/student/learning' })
          .catch((error) => request.log.error(error, 'student notification failed'))
      }
      const parentNote = shared.outputs.parentNote?.trim()
      if (parentNote) {
        void notifyParents([plan.studentId], { title: 'a new home-support plan', focus: plan.competencyGap, note: parentNote })
          .catch((error) => request.log.error(error, 'parent updates failed'))
      }
    }
    return shared
  })
}
