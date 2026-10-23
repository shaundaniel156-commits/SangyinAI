import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { SessionUser } from '../auth/session.ts'
import { requireRole, requireUser } from '../auth/session.ts'
import { prisma } from '../db/client.ts'
import { column, readSpreadsheet } from '../feed/spreadsheet.ts'
import { assessmentScope, classScope, studentScope } from './access.ts'
import { ASSESSMENT_TYPE_FROM_LABEL, assessmentInclude, byName, toAssessment } from './mappers.ts'

const teacherOrAdmin = { onRequest: requireRole('teacher', 'admin') }

const NewAssessmentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: z.enum(['Test', 'Quiz', 'Assignment', 'Teacher Observation']),
  subject: z.string().trim().min(1).max(60),
  classId: z.string().min(1),
  date: z.iso.date(),
  maxScore: z.number().int().min(1).max(1000),
  status: z.enum(['draft', 'scheduled', 'awaiting_scores', 'completed']).default('draft'),
  topics: z.array(z.string().trim().min(1)).max(20).default([]),
})

const ResultsSchema = z.object({
  results: z.array(z.object({ studentId: z.string().min(1), score: z.number().min(0).nullable(), remark: z.string().max(500).optional() })).max(200),
})

// An assessment the user may work with, or null.
function findAssessment(user: SessionUser, id: string) {
  return prisma.assessment.findFirst({ where: { id, class: classScope(user) } })
}

// Every student in the class (that the user may see) with their score, or null when none is entered yet (frontend AssessmentResult[]).
async function resultsFor(assessmentId: string, classId: string, user?: SessionUser) {
  const [students, results] = await Promise.all([
    prisma.student.findMany({ where: { classId, ...(user ? studentScope(user) : {}) }, select: { id: true, name: true } }),
    prisma.assessmentResult.findMany({ where: { assessmentId } }),
  ])
  const byStudent = new Map(results.map((r) => [r.studentId, r]))
  return students.sort(byName).map((s) => {
    const r = byStudent.get(s.id)
    return { studentId: s.id, score: r?.score ?? null, ...(r?.remark ? { remark: r.remark } : {}) }
  })
}

// Saves scores (null removes one), then moves the status on: some scores → awaiting_scores, all → completed.
async function saveResults(assessment: { id: string; classId: string; maxScore: number }, rows: z.infer<typeof ResultsSchema>['results']) {
  const classStudents = new Set((await prisma.student.findMany({ where: { classId: assessment.classId }, select: { id: true } })).map((s) => s.id))
  const problems = rows.flatMap((r) => [
    ...(classStudents.has(r.studentId) ? [] : [`${r.studentId} is not in this class`]),
    ...(r.score !== null && r.score > assessment.maxScore ? [`${r.studentId}: ${r.score} is more than the maximum of ${assessment.maxScore}`] : []),
  ])
  if (problems.length) return { problems }

  await prisma.$transaction(rows.map((r) =>
    r.score === null
      ? prisma.assessmentResult.deleteMany({ where: { assessmentId: assessment.id, studentId: r.studentId } })
      : prisma.assessmentResult.upsert({
          where: { assessmentId_studentId: { assessmentId: assessment.id, studentId: r.studentId } },
          update: { score: r.score, remark: r.remark ?? null },
          create: { assessmentId: assessment.id, studentId: r.studentId, score: r.score, remark: r.remark ?? null },
        }),
  ))
  const entered = await prisma.assessmentResult.count({ where: { assessmentId: assessment.id } })
  if (entered > 0) {
    await prisma.assessment.update({ where: { id: assessment.id }, data: { status: entered >= classStudents.size ? 'completed' : 'awaiting_scores' } })
  }
  return { problems: [] }
}

export async function assessmentRoutes(app: FastifyInstance) {
  // Assessments for the user's classes (or, for parents and students, their child's / their own class), newest first.
  // ?classId= narrows to one class. Replaces data/assessments.ts.
  app.get<{ Querystring: { classId?: string } }>('/assessments', { onRequest: requireUser }, async (request) => {
    const assessments = await prisma.assessment.findMany({
      where: { ...assessmentScope(request.user!), ...(request.query.classId ? { classId: request.query.classId } : {}) },
      include: assessmentInclude,
      orderBy: { date: 'desc' },
    })
    return assessments.map(toAssessment)
  })

  // Create an assessment (Create Assessment page).
  app.post('/assessments', teacherOrAdmin, async (request, reply) => {
    const parsed = NewAssessmentSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid assessment', issues: parsed.error.issues })
    const user = request.user!
    const { type, date, ...rest } = parsed.data
    if (!(await prisma.schoolClass.count({ where: { id: rest.classId, ...classScope(user) } }))) return reply.code(404).send({ error: 'Class not found.' })
    const created = await prisma.assessment.create({
      data: { ...rest, type: ASSESSMENT_TYPE_FROM_LABEL[type]!, date: new Date(date), createdById: user.sub },
      include: assessmentInclude,
    })
    return reply.code(201).send(toAssessment(created))
  })

  // Scores for every student in the class (null = not entered yet). Parents and students only get their own rows.
  app.get<{ Params: { id: string } }>('/assessments/:id/results', { onRequest: requireUser }, async (request, reply) => {
    const user = request.user!
    const assessment = await prisma.assessment.findFirst({ where: { id: request.params.id, ...assessmentScope(user) } })
    if (!assessment) return reply.code(404).send({ error: 'Assessment not found.' })
    return resultsFor(assessment.id, assessment.classId, user)
  })

  // Enter or change scores. Send only the students that changed; score null clears one.
  app.put<{ Params: { id: string } }>('/assessments/:id/results', teacherOrAdmin, async (request, reply) => {
    const parsed = ResultsSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid results', issues: parsed.error.issues })
    const assessment = await findAssessment(request.user!, request.params.id)
    if (!assessment) return reply.code(404).send({ error: 'Assessment not found.' })
    const { problems } = await saveResults(assessment, parsed.data.results)
    if (problems.length) return reply.code(400).send({ error: 'Some scores could not be saved', problems })
    const updated = await prisma.assessment.findUniqueOrThrow({ where: { id: assessment.id }, include: assessmentInclude })
    return { assessment: toAssessment(updated), results: await resultsFor(assessment.id, assessment.classId) }
  })

  // Import scores from a CSV or Excel file (Import Results page).
  // Without ?confirm=true it only previews the matches; with it, the matched rows are saved.
  // Columns: Learner Name (or Student ID), Marks, Comment (optional), Class (optional, ignored).
  app.post<{ Querystring: { assessmentId?: string; confirm?: string } }>('/assessments/import', teacherOrAdmin, async (request, reply) => {
    const assessment = request.query.assessmentId ? await findAssessment(request.user!, request.query.assessmentId) : null
    if (!assessment) return reply.code(404).send({ error: 'Choose the assessment to import into (?assessmentId=).' })
    const file = await request.file()
    if (!file) return reply.code(400).send({ error: 'Attach a .csv or .xlsx file.' })

    let rows: Record<string, string>[]
    try {
      rows = await readSpreadsheet(file.filename, await file.toBuffer())
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : 'The file could not be read.' })
    }
    const headings = Object.keys(rows[0] ?? {})
    const nameCol = column(headings, ['learner name', 'student name', 'name', 'student', 'learner'])
    const idCol = column(headings, ['student id', 'id'])
    const scoreCol = column(headings, ['marks', 'mark', 'score', 'scores'])
    const remarkCol = column(headings, ['comment', 'comments', 'remark', 'remarks'])
    if ((!nameCol && !idCol) || !scoreCol) {
      return reply.code(400).send({ error: 'The file needs a "Learner Name" (or "Student ID") column and a "Marks" column.', headings })
    }

    const students = await prisma.student.findMany({ where: { classId: assessment.classId }, select: { id: true, name: true } })
    const idByName = new Map(students.map((s) => [s.name.toLowerCase().replace(/\s+/g, ' '), s.id]))
    const ids = new Set(students.map((s) => s.id))
    const preview = rows.map((r, i) => {
      const name = nameCol ? r[nameCol] ?? '' : ''
      const studentId = idCol && ids.has(r[idCol] ?? '') ? r[idCol]! : idByName.get(name.toLowerCase().replace(/\s+/g, ' ')) ?? null
      const raw = (r[scoreCol] ?? '').trim()
      const score = raw === '' ? null : Number(raw)
      const problem = !studentId ? 'No student with this name in the class'
        : score !== null && (!Number.isFinite(score) || score < 0) ? 'Marks is not a number'
        : score !== null && score > assessment.maxScore ? `More than the maximum of ${assessment.maxScore}`
        : null
      return { row: i + 2, name, studentId, score, remark: remarkCol ? r[remarkCol] || undefined : undefined, problem }
    })
    const ready = preview.filter((p) => !p.problem)

    let saved = false
    if (request.query.confirm === 'true' && ready.length) {
      await saveResults(assessment, ready.map((p) => ({ studentId: p.studentId!, score: p.score, remark: p.remark })))
      saved = true
    }
    return { assessment: { id: assessment.id, title: assessment.title, maxScore: assessment.maxScore }, columns: { name: nameCol ?? null, studentId: idCol ?? null, score: scoreCol, remark: remarkCol ?? null }, rows: preview, ready: ready.length, problems: preview.length - ready.length, saved }
  })
}
