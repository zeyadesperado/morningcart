import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { requireUser } from '../auth'
import { notFound } from '../lib/errors'

export async function orderRoutes(app: FastifyInstance) {
  // toggle paid/unpaid — any user (rotating coordinator). The entire payment surface.
  app.patch('/api/orders/:id', async (req) => {
    requireUser(req)
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const { paid } = z.object({ paid: z.boolean() }).parse(req.body)
    const existing = await prisma.order.findUnique({ where: { id } })
    if (!existing) throw notFound('Order')
    const order = await prisma.order.update({ where: { id }, data: { paid } })
    return { order: { id: order.id, person: order.person, paid: order.paid } }
  })
}
