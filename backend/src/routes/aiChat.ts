import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { chatStream } from '../ai/chat.ts'
import { aiConfigured } from '../ai/client.ts'
import { logAiError } from '../ai/errors.ts'
import type { SessionUser } from '../auth/session.ts'
import { requireUser } from '../auth/session.ts'
import { prisma } from '../db/client.ts'
import { studentScope } from './access.ts'

// Everyone signed in can ask: teachers and admins, students and parents. The AI is told who is asking (ai/chat.ts).
const signedIn = { onRequest: requireUser }

// What helps the AI pitch its answer for a student or a parent: the class level and the topics found hard, for the
// student themselves or for each of a parent's children. No names.
async function factsFor(user: SessionUser): Promise<string | undefined> {
  if (user.role !== 'student' && user.role !== 'parent') return undefined
  const students = await prisma.student.findMany({
    where: studentScope(user),
    take: 6,
    select: {
      class: { select: { level: true } },
      competencyScores: { where: { level: { in: ['needs_support', 'developing'] } }, orderBy: { score: 'asc' }, take: 4, select: { competency: { select: { name: true, subject: true } } } },
    },
  })
  if (!students.length) return undefined
  const describe = (s: (typeof students)[number]) => {
    const hard = s.competencyScores.map((c) => `${c.competency.name} (${c.competency.subject})`).join(', ')
    return `class level ${s.class.level}${hard ? `; topics found hard: ${hard}` : ''}`
  }
  return user.role === 'student' ? `The learner: ${describe(students[0]!)}.` : students.map((s, i) => `Child ${students.length > 1 ? i + 1 : ''}: ${describe(s)}.`.replace('Child :', 'Their child:')).join(' ')
}

// A reply from the AI can run long (a full lesson plan), so its text is allowed more room than a typed question.
const TurnSchema = z.object({ role: z.enum(['user', 'ai']), text: z.string().trim().min(1).max(20_000) })
const ChatSchema = z
  // context: where the user is and what they are doing (e.g. the assessment builder's current choices).
  .object({ messages: z.array(TurnSchema).min(1).max(40), context: z.string().max(3000).optional() })
  .refine((b) => b.messages.at(-1)?.role === 'user', { message: 'The last message must be from the user.' })

// A conversation to keep: its title (the first question, shortened) and its turns so far.
const SaveSchema = z.object({ title: z.string().trim().min(1).max(120), messages: z.array(TurnSchema).min(1).max(80) })
// The browser makes the conversation's id when it starts.
const ConversationId = z.string().regex(/^[A-Za-z0-9-]{8,64}$/)
// Each user keeps this many conversations; saving another drops the oldest.
const KEEP = 50

export async function aiChatRoutes(app: FastifyInstance) {
  // "Ask Sangyin AI": the conversation so far goes in, the reply streams back as plain text while the AI writes it.
  // Saving the conversation is separate (PUT /ai/chats/:id below), done by the page once a reply has finished.
  app.post(
    '/ai/chat',
    {
      onRequest: requireUser,
      config: { rateLimit: { max: 60, timeWindow: '1 hour', hook: 'preHandler' as const, keyGenerator: (request: FastifyRequest) => request.user?.sub ?? request.ip } },
    },
    async (request, reply) => {
      const parsed = ChatSchema.safeParse(request.body)
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Invalid message' })
      if (!aiConfigured()) return reply.code(503).send({ error: 'The AI is not set up on this server yet.' })
      const user = request.user!
      const school = await prisma.school.findUnique({ where: { id: user.schoolId }, select: { name: true, type: true, framework: true } })
      if (!school) return reply.code(404).send({ error: 'School not found.' })
      const facts = await factsFor(user).catch(() => undefined)

      // From here the reply is written directly, piece by piece (Fastify's own reply handling is bypassed).
      reply.hijack()
      const headers: Record<string, string> = {}
      for (const [key, value] of Object.entries(reply.getHeaders())) if (typeof value === 'string') headers[key] = value
      reply.raw.writeHead(200, { ...headers, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' })
      let written = false
      try {
        for await (const text of chatStream(parsed.data.messages, { school, user: { name: user.name, role: user.role }, facts, context: parsed.data.context })) {
          reply.raw.write(text)
          written = true
        }
      } catch (error) {
        logAiError(error)
        reply.raw.write(written ? '\n\n(The AI stopped answering there. Please ask again.)' : 'Sorry — I can’t reach the AI service right now; Google says it is busy. Please try again in a few minutes.')
      } finally {
        reply.raw.end()
      }
    },
  )

  // The signed-in user's saved conversations, most recent first (titles only; a conversation's turns come from the next route).
  app.get('/ai/chats', signedIn, async (request) => {
    const chats = await prisma.aiConversation.findMany({ where: { userId: request.user!.sub }, orderBy: { updatedAt: 'desc' }, take: KEEP, select: { id: true, title: true, updatedAt: true } })
    return chats.map((c) => ({ id: c.id, title: c.title, updatedOn: c.updatedAt.toISOString() }))
  })

  // One saved conversation, to carry on with.
  app.get<{ Params: { id: string } }>('/ai/chats/:id', signedIn, async (request, reply) => {
    const chat = await prisma.aiConversation.findFirst({ where: { id: request.params.id, userId: request.user!.sub } })
    if (!chat) return reply.code(404).send({ error: 'Conversation not found.' })
    return { id: chat.id, title: chat.title, updatedOn: chat.updatedAt.toISOString(), messages: chat.messages }
  })

  // Saves a conversation (a new one, or more turns on one already saved). Only its owner can change it.
  app.put<{ Params: { id: string } }>('/ai/chats/:id', { ...signedIn, bodyLimit: 4 * 1024 * 1024 }, async (request, reply) => {
    const id = ConversationId.safeParse(request.params.id)
    const parsed = SaveSchema.safeParse(request.body)
    if (!id.success || !parsed.success) return reply.code(400).send({ error: 'Invalid conversation' })
    const userId = request.user!.sub
    const existing = await prisma.aiConversation.findUnique({ where: { id: id.data }, select: { userId: true } })
    if (existing && existing.userId !== userId) return reply.code(404).send({ error: 'Conversation not found.' })

    const saved = await prisma.aiConversation.upsert({ where: { id: id.data }, create: { id: id.data, userId, ...parsed.data }, update: parsed.data })
    // Keep the most recent conversations only.
    const old = await prisma.aiConversation.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, skip: KEEP, select: { id: true } })
    if (old.length) await prisma.aiConversation.deleteMany({ where: { id: { in: old.map((c) => c.id) } } })
    return { id: saved.id, title: saved.title, updatedOn: saved.updatedAt.toISOString() }
  })

  app.delete<{ Params: { id: string } }>('/ai/chats/:id', signedIn, async (request, reply) => {
    await prisma.aiConversation.deleteMany({ where: { id: request.params.id, userId: request.user!.sub } })
    return reply.code(204).send()
  })
}
