import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { chatStream } from '../ai/chat.ts'
import { aiConfigured } from '../ai/client.ts'
import { logAiError } from '../ai/errors.ts'
import { requireRole } from '../auth/session.ts'
import { prisma } from '../db/client.ts'

const TurnSchema = z.object({ role: z.enum(['user', 'ai']), text: z.string().trim().min(1).max(6000) })
const ChatSchema = z
  .object({ messages: z.array(TurnSchema).min(1).max(40) })
  .refine((b) => b.messages.at(-1)?.role === 'user', { message: 'The last message must be from the user.' })

export async function aiChatRoutes(app: FastifyInstance) {
  // "Ask the AI": the conversation so far goes in, the reply streams back as plain text while the AI writes it.
  // Nothing is stored on the server; the browser keeps the conversation.
  app.post(
    '/ai/chat',
    {
      onRequest: requireRole('teacher', 'admin'),
      config: { rateLimit: { max: 60, timeWindow: '1 hour', hook: 'preHandler' as const, keyGenerator: (request: FastifyRequest) => request.user?.sub ?? request.ip } },
    },
    async (request, reply) => {
      const parsed = ChatSchema.safeParse(request.body)
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Invalid message' })
      if (!aiConfigured()) return reply.code(503).send({ error: 'The AI is not set up on this server yet.' })
      const user = request.user!
      const school = await prisma.school.findUnique({ where: { id: user.schoolId }, select: { name: true, type: true, framework: true } })
      if (!school) return reply.code(404).send({ error: 'School not found.' })

      // From here the reply is written directly, piece by piece (Fastify's own reply handling is bypassed).
      reply.hijack()
      const headers: Record<string, string> = {}
      for (const [key, value] of Object.entries(reply.getHeaders())) if (typeof value === 'string') headers[key] = value
      reply.raw.writeHead(200, { ...headers, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' })
      let written = false
      try {
        for await (const text of chatStream(parsed.data.messages, { school, user: { name: user.name, role: user.role } })) {
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
}
