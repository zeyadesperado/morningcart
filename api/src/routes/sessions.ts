import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma, restaurantInclude, sessionInclude } from '../db'
import { requireUser } from '../auth'
import { badRequest, conflict, notFound } from '../lib/errors'
import { computeResult, serviceDateToday } from '../lib/domain'
import { serializeSession } from '../lib/serialize'

async function loadSession(id: string) {
  const s = await prisma.session.findUnique({ where: { id }, include: sessionInclude })
  if (!s) throw notFound('Session')
  return s
}
async function loadRestaurant(id: string) {
  const r = await prisma.restaurant.findUnique({ where: { id }, include: restaurantInclude })
  if (!r) throw notFound('Restaurant')
  return r
}
const restaurantSummary = (r: { id: string; name: string; arabic: string | null; deliveryFee: number }) => ({
  id: r.id,
  name: r.name,
  arabic: r.arabic,
  deliveryFee: r.deliveryFee,
})

export async function sessionRoutes(app: FastifyInstance) {
  // current open session (optionally scoped to a restaurant) — the poll target
  app.get('/api/sessions/open', async (req) => {
    requireUser(req)
    const { restaurantId } = z.object({ restaurantId: z.string().optional() }).parse(req.query)
    const s = await prisma.session.findFirst({
      where: { status: 'open', ...(restaurantId ? { restaurantId } : {}) },
      include: sessionInclude,
      orderBy: { createdAt: 'desc' },
    })
    if (!s) throw notFound('Open session')
    return { session: serializeSession(s, await loadRestaurant(s.restaurantId)) }
  })

  // start breakfast — guard: only one open session per restaurant per day
  app.post('/api/sessions', async (req) => {
    const person = requireUser(req)
    const { restaurantId } = z.object({ restaurantId: z.string() }).parse(req.body)
    const r = await loadRestaurant(restaurantId)
    const serviceDate = serviceDateToday()
    const existing = await prisma.session.findFirst({
      where: { restaurantId, status: 'open', serviceDate },
      include: sessionInclude,
    })
    if (existing) return { session: serializeSession(existing, r) }
    try {
      const created = await prisma.session.create({
        data: { restaurantId, startedBy: person, serviceDate, status: 'open' },
        include: sessionInclude,
      })
      return { session: serializeSession(created, r) }
    } catch (e) {
      // race: another request opened the session between our check and this insert
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const open = await prisma.session.findFirst({
          where: { restaurantId, status: 'open', serviceDate },
          include: sessionInclude,
        })
        if (open) return { session: serializeSession(open, r) }
      }
      throw e
    }
  })

  app.get('/api/sessions/:id', async (req) => {
    requireUser(req)
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const s = await loadSession(id)
    return { session: serializeSession(s, await loadRestaurant(s.restaurantId)) }
  })

  // upsert MY order (one per person; replaces my lines)
  app.put('/api/sessions/:id/order', async (req) => {
    const person = requireUser(req)
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const { lines } = z
      .object({
        lines: z
          .array(
            z.object({
              menuItemId: z.string(),
              qty: z.number().int().min(1).max(10),
              note: z.string().max(120).optional(),
              forName: z.string().max(40).optional(),
            }),
          )
          .min(1),
      })
      .parse(req.body)

    const s = await loadSession(id)
    if (s.status !== 'open') throw conflict('Ordering is closed')
    const r = await loadRestaurant(s.restaurantId)
    const menu = new Map(r.menu.map((m) => [m.id, m]))
    for (const l of lines) if (!menu.has(l.menuItemId)) throw badRequest(`Unknown item ${l.menuItemId}`)

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.upsert({
        where: { sessionId_person: { sessionId: id, person } },
        create: { sessionId: id, person },
        update: {},
      })
      await tx.orderLine.deleteMany({ where: { orderId: order.id } })
      await tx.orderLine.createMany({
        data: lines.map((l) => ({
          orderId: order.id,
          menuItemId: l.menuItemId,
          qty: l.qty,
          note: l.note,
          forName: l.forName,
          unitPrice: menu.get(l.menuItemId)!.price, // snapshot
        })),
      })
    })
    return { session: serializeSession(await loadSession(id), r) }
  })

  app.delete('/api/sessions/:id/order', async (req) => {
    const person = requireUser(req)
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const s = await loadSession(id)
    if (s.status !== 'open') throw conflict('Ordering is closed')
    await prisma.order.deleteMany({ where: { sessionId: id, person } })
    return { session: serializeSession(await loadSession(id), await loadRestaurant(s.restaurantId)) }
  })

  // close & aggregate — any user; idempotent (re-closing returns the result)
  app.post('/api/sessions/:id/close', async (req) => {
    requireUser(req)
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const s = await loadSession(id)
    const r = await loadRestaurant(s.restaurantId)
    if (s.status === 'open' && s.orders.length === 0) {
      throw badRequest('Cannot close a session with no orders — it would strand the delivery fee')
    }
    if (s.status === 'open') {
      await prisma.session.update({ where: { id }, data: { status: 'closed', closedAt: new Date() } })
    }
    const fresh = await loadSession(id)
    return {
      sessionId: fresh.id,
      status: 'closed' as const,
      serviceDate: fresh.serviceDate,
      restaurant: restaurantSummary(r),
      result: computeResult(fresh, r),
    }
  })

  // result preview (works open or closed)
  app.get('/api/sessions/:id/result', async (req) => {
    requireUser(req)
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const s = await loadSession(id)
    const r = await loadRestaurant(s.restaurantId)
    return {
      sessionId: s.id,
      status: s.status,
      serviceDate: s.serviceDate,
      restaurant: restaurantSummary(r),
      result: computeResult(s, r),
    }
  })
}
