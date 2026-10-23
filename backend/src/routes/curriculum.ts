import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireRole, requireUser } from '../auth/session.ts'
import { prisma } from '../db/client.ts'

const FRAMEWORKS = [
  {
    id: 'uganda' as const,
    name: 'Uganda National Curriculum',
    shortName: 'NCDC',
    description: 'Competency-based framework used in government-aided and many private schools in Uganda. Guidance maps to NCDC learning outcomes and supports UNEB assessment objectives for exam preparation.',
  },
  {
    id: 'cambridge' as const,
    name: 'Cambridge International Curriculum',
    shortName: 'Cambridge',
    description: 'International framework used by schools running Cambridge programmes and examinations (Primary, Lower Secondary and IGCSE). Guidance maps to Cambridge learning and assessment objectives.',
  },
]

const NewObjectiveSchema = z.object({
  competencyId: z.string().min(1),
  code: z.string().trim().min(1).max(40),
  text: z.string().trim().min(1).max(500),
})

export async function curriculumRoutes(app: FastifyInstance) {
  // The curriculum in the frontend's CurriculumFrameworkData shape: framework → level → subject → topic →
  // competency statement → objectives. Objectives are the shared ones plus those the user's own school added.
  // Replaces CURRICULUM_FRAMEWORKS in data/curriculum.ts.
  app.get('/curriculum', { onRequest: requireUser }, async (request) => {
    const user = request.user!
    const [school, levels] = await Promise.all([
      prisma.school.findUniqueOrThrow({ where: { id: user.schoolId } }),
      prisma.curriculumLevel.findMany({
        // Shared levels (the outline) plus the institution's own.
        where: { OR: [{ schoolId: null }, { schoolId: user.schoolId }] },
        orderBy: [{ programme: { code: 'asc' } }, { position: 'asc' }],
        include: {
          programme: true,
          subjects: {
            orderBy: { position: 'asc' },
            include: {
              topics: {
                orderBy: { position: 'asc' },
                include: {
                  competencies: {
                    orderBy: { position: 'asc' },
                    include: { objectives: { where: { OR: [{ schoolId: null }, { schoolId: user.schoolId }] }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] } },
                  },
                },
              },
            },
          },
        },
      }),
    ])
    // The institution's own curriculum is a third framework, shown only to that institution.
    const frameworks = [
      ...FRAMEWORKS,
      { id: 'institution' as const, name: `${school.name} curriculum`, shortName: school.name, description: 'Programmes, courses, subjects and topics your institution has added in the Manual feed.' },
    ]
    return frameworks
      .map((f) => ({
        ...f,
        levels: levels.filter((l) => l.framework === f.id).map((l) => ({
          id: l.id,
          // University years read "BCS Year 1"; school levels keep their own name.
          name: l.programme ? `${l.programme.code} ${l.name}` : l.name,
          stage: l.programme ? l.programme.name : l.stage,
          ...(l.programme ? { programme: { id: l.programme.id, code: l.programme.code, name: l.programme.name } } : {}),
          subjects: l.subjects.map((s) => ({
            id: s.id,
            name: s.name,
            ...(s.code ? { code: s.code } : {}),
            ...(s.term ? { term: s.term } : {}),
            ...(s.creditUnits !== null ? { creditUnits: s.creditUnits } : {}),
            topics: s.topics.map((t) => ({
              id: t.id,
              name: t.name,
              ...(t.description ? { description: t.description } : {}),
              competencies: t.competencies.map((c) => ({
                id: c.id,
                name: c.name,
                objectives: c.objectives.map((o) => ({ id: o.id, code: o.code, text: o.text, ...(o.schoolId ? { schoolAdded: true } : {}) })),
              })),
            })),
          })),
        })),
      }))
      .filter((f) => f.id !== 'institution' || f.levels.length > 0)
  })

  // A school adds an official objective (code and wording) under one of the outline's statements.
  // Only that school sees it. The school is responsible for having the right to use the text.
  app.post('/curriculum/objectives', { onRequest: requireRole('teacher', 'admin') }, async (request, reply) => {
    const parsed = NewObjectiveSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Add a code and the objective text.', issues: parsed.error.issues })
    const user = request.user!
    if (!(await prisma.curriculumCompetency.count({ where: { id: parsed.data.competencyId } }))) return reply.code(404).send({ error: 'Curriculum statement not found.' })
    const position = await prisma.learningObjective.count({ where: { competencyId: parsed.data.competencyId } })
    const created = await prisma.learningObjective.create({ data: { ...parsed.data, position, schoolId: user.schoolId, createdById: user.sub } })
    return reply.code(201).send({ id: created.id, code: created.code, text: created.text, schoolAdded: true })
  })

  // Remove one of the school's own objectives (a teacher can remove those they added; an admin any of the school's).
  app.delete<{ Params: { id: string } }>('/curriculum/objectives/:id', { onRequest: requireRole('teacher', 'admin') }, async (request, reply) => {
    const user = request.user!
    const { count } = await prisma.learningObjective.deleteMany({
      where: { id: request.params.id, schoolId: user.schoolId, ...(user.role === 'teacher' ? { createdById: user.sub } : {}) },
    })
    if (!count) return reply.code(404).send({ error: 'Objective not found, or it was not added by your school.' })
    return reply.code(204).send()
  })
}
