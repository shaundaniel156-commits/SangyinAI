import type { FastifyInstance } from 'fastify'
import { hash } from '@node-rs/argon2'
import { z } from 'zod'
import { requireRole } from '../auth/session.ts'
import { prisma } from '../db/client.ts'
import { FEED_KINDS, type Row } from '../feed/kinds.ts'
import { documentText, toPassages } from '../feed/references.ts'
import { column, csvLine, readSpreadsheet } from '../feed/spreadsheet.ts'
import { sendAccountDetails } from '../messaging/messages.ts'

const staffOnly = { onRequest: requireRole('teacher', 'admin') }
const adminOnly = { onRequest: requireRole('admin') }

const RowsSchema = z.object({ rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]).transform(String))).min(1).max(2000) })
const ReferenceSchema = z.object({
  title: z.string().trim().min(1).max(200),
  kind: z.enum(['notes', 'scheme_of_work', 'lesson_plan', 'course_outline', 'past_paper', 'other']).default('notes'),
  subject: z.string().trim().max(120).optional(),
  level: z.string().trim().max(120).optional(),
  text: z.string().trim().min(20).max(500_000),
  rightsConfirmed: z.boolean(),
})
const InstitutionSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  district: z.string().trim().max(120).optional(),
  type: z.enum(['primary', 'secondary', 'university', 'mixed']).optional(),
})

export async function feedRoutes(app: FastifyInstance) {
  // The kinds of data the signed-in user may feed in, with their columns (for forms, templates and help).
  app.get('/feed/kinds', staffOnly, async (request) => {
    const role = request.user!.role
    return Object.values(FEED_KINDS).filter((k) => k.roles.includes(role)).map(({ key, label, description, columns }) => ({ key, label, description, columns }))
  })

  // A CSV template: the column headings and one example row.
  app.get<{ Params: { kind: string } }>('/feed/:kind/template', staffOnly, async (request, reply) => {
    const kind = FEED_KINDS[request.params.kind]
    if (!kind || !kind.roles.includes(request.user!.role)) return reply.code(404).send({ error: 'Unknown data type.' })
    const csv = [csvLine(kind.columns.map((c) => c.header)), csvLine(kind.columns.map((c) => c.example))].join('\r\n') + '\r\n'
    return reply.header('content-type', 'text/csv; charset=utf-8').header('content-disposition', `attachment; filename="sangyin-${kind.key}-template.csv"`).send('﻿' + csv)
  })

  // Checks rows without saving: an uploaded CSV/Excel file, or rows from a form ({ rows: [...] }).
  // Returns each row with its values (by column key) and any problems.
  app.post<{ Params: { kind: string } }>('/feed/:kind/preview', staffOnly, async (request, reply) => {
    const kind = FEED_KINDS[request.params.kind]
    if (!kind || !kind.roles.includes(request.user!.role)) return reply.code(404).send({ error: 'Unknown data type.' })

    let rows: Row[]
    let firstRow = 1
    if (request.isMultipart()) {
      const file = await request.file()
      if (!file) return reply.code(400).send({ error: 'Attach a .csv or .xlsx file.' })
      let raw: Record<string, string>[]
      try {
        raw = await readSpreadsheet(file.filename, await file.toBuffer())
      } catch (error) {
        return reply.code(400).send({ error: (error as Error).message })
      }
      const headings = Object.keys(raw[0] ?? {})
      const map = kind.columns.map((c) => [c.key, column(headings, [c.header, c.key, ...(c.aliases ?? [])])] as const)
      const missing = kind.columns.filter((c) => c.required && !map.find(([k]) => k === c.key)?.[1]).map((c) => c.header)
      if (missing.length) return reply.code(400).send({ error: `The file is missing these columns: ${missing.join(', ')}. Download the template to see the expected headings.`, headings })
      rows = raw.map((r) => Object.fromEntries(map.filter(([, h]) => h).map(([k, h]) => [k, r[h!] ?? ''])))
      firstRow = 2
    } else {
      const parsed = RowsSchema.safeParse(request.body)
      if (!parsed.success) return reply.code(400).send({ error: 'Send rows to check.', issues: parsed.error.issues })
      rows = parsed.data.rows
    }
    const problems = await kind.check(rows, request.user!)
    const checked = rows.map((values, i) => ({ row: i + firstRow, values, problems: problems[i]! }))
    return { kind: kind.key, columns: kind.columns, rows: checked, ready: checked.filter((r) => !r.problems.length).length, problems: checked.filter((r) => r.problems.length).length }
  })

  // Saves rows (after a preview, or straight from a form). Rows with problems are skipped and listed.
  app.post<{ Params: { kind: string } }>('/feed/:kind/commit', staffOnly, async (request, reply) => {
    const kind = FEED_KINDS[request.params.kind]
    if (!kind || !kind.roles.includes(request.user!.role)) return reply.code(404).send({ error: 'Unknown data type.' })
    const parsed = RowsSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Send rows to save.', issues: parsed.error.issues })
    const rows = parsed.data.rows
    const problems = await kind.check(rows, request.user!)
    const good = rows.filter((_, i) => !problems[i]!.length)
    const rejected = rows.map((values, i) => ({ row: i + 1, values, problems: problems[i]! })).filter((r) => r.problems.length)
    if (!good.length) return reply.code(400).send({ error: 'No rows could be saved.', rejected })
    const result = await kind.apply(good, request.user!)
    // Send each new account its sign-in details (email, plus SMS if a phone was given), and tell the admin what went out.
    if (result.accounts?.length) {
      const school = await prisma.school.findUnique({ where: { id: request.user!.schoolId } })
      await Promise.all(result.accounts.map(async (account) => {
        const d = await sendAccountDetails(account, account.tempPassword, school?.name ?? 'your school')
        account.emailSent = Boolean(d.email?.sent)
        if (d.sms) account.smsSent = d.sms.sent
        const errors = [d.email?.error, d.sms?.error].filter(Boolean)
        if (errors.length) account.deliveryError = errors.join(' ')
      }))
    }
    return { ...result, rejected }
  })

  // --- Question bank ---
  app.get<{ Querystring: { subject?: string; competency?: string } }>('/feed/questions', staffOnly, async (request) => {
    const items = await prisma.bankQuestion.findMany({
      where: {
        schoolId: request.user!.schoolId,
        ...(request.query.subject ? { subject: { equals: request.query.subject, mode: 'insensitive' } } : {}),
        ...(request.query.competency ? { competency: { equals: request.query.competency, mode: 'insensitive' } } : {}),
      },
      include: { createdBy: { select: { name: true } } },
      orderBy: [{ subject: 'asc' }, { competency: 'asc' }, { createdAt: 'desc' }],
      take: 2000,
    })
    return items.map(({ createdBy, schoolId: _s, createdById, ...q }) => ({ ...q, createdById, createdByName: createdBy?.name ?? null }))
  })
  app.delete<{ Params: { id: string } }>('/feed/questions/:id', staffOnly, async (request, reply) => {
    const user = request.user!
    const { count } = await prisma.bankQuestion.deleteMany({ where: { id: request.params.id, schoolId: user.schoolId, ...(user.role === 'teacher' ? { createdById: user.sub } : {}) } })
    return count ? reply.code(204).send() : reply.code(404).send({ error: 'Question not found, or added by someone else.' })
  })

  // --- Reference material ---
  app.get('/feed/references', staffOnly, async (request) => {
    const docs = await prisma.referenceDocument.findMany({
      where: { schoolId: request.user!.schoolId },
      include: { createdBy: { select: { name: true } }, _count: { select: { chunks: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return docs.map((d) => ({ id: d.id, title: d.title, kind: d.kind, subject: d.subject, level: d.level, filename: d.filename, passages: d._count.chunks, createdById: d.createdById, createdByName: d.createdBy?.name ?? null, createdAt: d.createdAt.toISOString() }))
  })

  // Add reference material: upload a file (multipart: file + title, kind, subject, level, rightsConfirmed) or paste text (JSON).
  app.post('/feed/references', staffOnly, async (request, reply) => {
    const user = request.user!
    let fields: Record<string, unknown>
    let filename: string | null = null
    if (request.isMultipart()) {
      const file = await request.file()
      if (!file) return reply.code(400).send({ error: 'Attach a file.' })
      const form = Object.fromEntries(Object.entries(file.fields).map(([k, f]) => [k, (f as { value?: unknown }).value]))
      try {
        fields = { ...form, text: await documentText(file.filename, await file.toBuffer()), rightsConfirmed: form.rightsConfirmed === 'true' }
      } catch (error) {
        return reply.code(400).send({ error: (error as Error).message })
      }
      filename = file.filename
      fields.title = fields.title || file.filename.replace(/\.[^.]+$/, '')
    } else {
      fields = request.body as Record<string, unknown>
    }
    const parsed = ReferenceSchema.safeParse({ ...fields, subject: fields.subject || undefined, level: fields.level || undefined })
    if (!parsed.success) {
      const short = parsed.error.issues.some((i) => i.path[0] === 'text') ? 'The document has no readable text (scanned PDFs need to be typed or converted first).' : 'Check the title and the other fields.'
      return reply.code(400).send({ error: short, issues: parsed.error.issues })
    }
    if (!parsed.data.rightsConfirmed) return reply.code(400).send({ error: 'Confirm that your institution has the right to use this material.' })
    const passages = toPassages(parsed.data.text)
    const doc = await prisma.referenceDocument.create({
      data: {
        schoolId: user.schoolId, createdById: user.sub, title: parsed.data.title, kind: parsed.data.kind, subject: parsed.data.subject ?? null, level: parsed.data.level ?? null, filename, rightsConfirmed: true,
        chunks: { create: passages.map((text, position) => ({ text, position })) },
      },
    })
    return reply.code(201).send({ id: doc.id, title: doc.title, passages: passages.length })
  })
  app.delete<{ Params: { id: string } }>('/feed/references/:id', staffOnly, async (request, reply) => {
    const user = request.user!
    const { count } = await prisma.referenceDocument.deleteMany({ where: { id: request.params.id, schoolId: user.schoolId, ...(user.role === 'teacher' ? { createdById: user.sub } : {}) } })
    return count ? reply.code(204).send() : reply.code(404).send({ error: 'Document not found, or added by someone else.' })
  })

  // --- The institution's own curriculum ---
  app.get('/feed/curriculum', adminOnly, async (request) => {
    const levels = await prisma.curriculumLevel.findMany({
      where: { schoolId: request.user!.schoolId },
      include: { programme: true, subjects: { orderBy: { position: 'asc' }, include: { _count: { select: { topics: true } } } }, _count: { select: { classes: true } } },
      orderBy: [{ programme: { code: 'asc' } }, { position: 'asc' }],
    })
    return levels.map((l) => ({
      id: l.id,
      name: l.programme ? `${l.programme.code} ${l.name}` : l.name,
      programme: l.programme ? { id: l.programme.id, code: l.programme.code, name: l.programme.name, award: l.programme.award, years: l.programme.years } : null,
      classes: l._count.classes,
      subjects: l.subjects.map((s) => ({ id: s.id, name: s.name, code: s.code, term: s.term, creditUnits: s.creditUnits, topics: s._count.topics })),
    }))
  })
  app.delete<{ Params: { id: string } }>('/feed/curriculum/levels/:id', adminOnly, async (request, reply) => {
    const { count } = await prisma.curriculumLevel.deleteMany({ where: { id: request.params.id, schoolId: request.user!.schoolId } })
    return count ? reply.code(204).send() : reply.code(404).send({ error: 'Level not found.' })
  })
  app.delete<{ Params: { id: string } }>('/feed/curriculum/subjects/:id', adminOnly, async (request, reply) => {
    const { count } = await prisma.curriculumSubject.deleteMany({ where: { id: request.params.id, level: { schoolId: request.user!.schoolId } } })
    return count ? reply.code(204).send() : reply.code(404).send({ error: 'Subject not found.' })
  })

  // --- Staff list ---
  app.get('/feed/staff', adminOnly, async (request) => {
    const users = await prisma.user.findMany({
      where: { schoolId: request.user!.schoolId, role: { in: ['teacher', 'admin'] } },
      include: { classesTaught: { select: { name: true } } },
      orderBy: { name: 'asc' },
    })
    return users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, subjects: u.subjects, classes: u.classesTaught.map((c) => c.name), lastActiveAt: u.lastActiveAt?.toISOString() ?? null }))
  })

  // Every account in the school, for the administrator's Users page.
  app.get('/feed/users', adminOnly, async (request) => {
    const users = await prisma.user.findMany({
      where: { schoolId: request.user!.schoolId },
      include: { studentProfile: { include: { class: { select: { name: true } } } }, children: { include: { student: { select: { name: true } } } } },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    })
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      detail:
        u.role === 'teacher' ? u.subjects.join(', ')
        : u.role === 'student' ? (u.studentProfile?.class.name ?? '')
        : u.role === 'parent' ? (u.children.length ? `Linked to ${u.children.map((c) => c.student.name).join(', ')}` : 'No linked children')
        : 'Administrator',
      lastActiveAt: u.lastActiveAt?.toISOString() ?? null,
    }))
  })

  // Sets a new password for an account in the school (e.g. a forgotten or never-received one-time password).
  app.patch<{ Params: { id: string } }>('/feed/users/:id/password', adminOnly, async (request, reply) => {
    const parsed = z.object({ password: z.string().min(8).max(200) }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'The password must be at least 8 characters.' })
    const user = await prisma.user.findFirst({ where: { id: request.params.id, schoolId: request.user!.schoolId } })
    if (!user) return reply.code(404).send({ error: 'User not found.' })
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hash(parsed.data.password), status: 'active' } })
    request.log.info({ user: user.id, by: request.user!.sub }, 'password set by admin')
    return reply.code(204).send()
  })

  // Deletes an account. Work they made (assessments, AI drafts) is kept and moves to the administrator
  // deleting them; a student's record and results stay, only the sign-in goes. Admins can't delete themselves.
  app.delete<{ Params: { id: string } }>('/feed/users/:id', adminOnly, async (request, reply) => {
    const me = request.user!
    if (request.params.id === me.sub) return reply.code(400).send({ error: 'You cannot delete your own account.' })
    const user = await prisma.user.findFirst({ where: { id: request.params.id, schoolId: me.schoolId } })
    if (!user) return reply.code(404).send({ error: 'User not found.' })
    if (user.role === 'admin' && (await prisma.user.count({ where: { schoolId: me.schoolId, role: 'admin', status: 'active' } })) <= 1) {
      return reply.code(400).send({ error: 'The school needs at least one administrator.' })
    }
    await prisma.$transaction([
      prisma.assessment.updateMany({ where: { createdById: user.id }, data: { createdById: me.sub } }),
      prisma.aiAssessment.updateMany({ where: { createdById: user.id }, data: { createdById: me.sub } }),
      prisma.schoolClass.updateMany({ where: { teacherId: user.id }, data: { teacherId: null } }),
      prisma.student.updateMany({ where: { userId: user.id }, data: { userId: null } }),
      prisma.guidancePlan.updateMany({ where: { decidedById: user.id }, data: { decidedById: null } }),
      prisma.user.delete({ where: { id: user.id } }),
    ])
    request.log.info({ deletedUser: user.id, by: me.sub }, 'user deleted')
    return reply.code(204).send()
  })

  // --- The institution itself ---
  app.get('/feed/institution', staffOnly, async (request) => {
    const s = await prisma.school.findUniqueOrThrow({ where: { id: request.user!.schoolId } })
    return { id: s.id, name: s.name, district: s.district, type: s.type }
  })
  app.patch('/feed/institution', adminOnly, async (request, reply) => {
    const parsed = InstitutionSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid institution details.', issues: parsed.error.issues })
    const s = await prisma.school.update({ where: { id: request.user!.schoolId }, data: parsed.data })
    return { id: s.id, name: s.name, district: s.district, type: s.type }
  })
}
