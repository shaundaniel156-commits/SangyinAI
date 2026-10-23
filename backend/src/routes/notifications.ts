import type { FastifyInstance } from 'fastify'
import { requireUser } from '../auth/session.ts'
import { prisma } from '../db/client.ts'
import { toNotification } from './mappers.ts'

export async function notificationRoutes(app: FastifyInstance) {
  // The signed-in user's notifications, newest first. Replaces data/notifications.ts.
  app.get('/notifications', { onRequest: requireUser }, async (request) => {
    const user = request.user!
    const items = await prisma.notification.findMany({ where: { userId: user.sub }, orderBy: { createdAt: 'desc' }, take: 100 })
    return items.map((n) => toNotification(n, user.role))
  })

  // Mark all of the user's notifications as read.
  app.patch('/notifications/read-all', { onRequest: requireUser }, async (request) => {
    const { count } = await prisma.notification.updateMany({ where: { userId: request.user!.sub, readAt: null }, data: { readAt: new Date() } })
    return { changed: count }
  })

  // Mark one notification as read.
  app.patch<{ Params: { id: string } }>('/notifications/:id/read', { onRequest: requireUser }, async (request, reply) => {
    const user = request.user!
    const { count } = await prisma.notification.updateMany({ where: { id: request.params.id, userId: user.sub, readAt: null }, data: { readAt: new Date() } })
    const item = await prisma.notification.findFirst({ where: { id: request.params.id, userId: user.sub } })
    if (!item) return reply.code(404).send({ error: 'Notification not found.' })
    return { ...toNotification(item, user.role), changed: count > 0 }
  })
}
