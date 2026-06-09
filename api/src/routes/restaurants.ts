import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma, restaurantInclude } from '../db'
import { requireUser } from '../auth'
import { conflict, notFound } from '../lib/errors'
import { serializeRestaurant } from '../lib/serialize'

const itemKind = z.enum(['plate', 'drink', 'extra'])

async function loadRestaurant(id: string) {
  const r = await prisma.restaurant.findUnique({ where: { id }, include: restaurantInclude })
  if (!r) throw notFound('Restaurant')
  return r
}

export async function restaurantRoutes(app: FastifyInstance) {
  app.get('/api/restaurants', async () => {
    const rows = await prisma.restaurant.findMany({
      where: { active: true },
      include: restaurantInclude,
      orderBy: { name: 'asc' },
    })
    return { restaurants: rows.map(serializeRestaurant) }
  })

  app.post('/api/restaurants', async (req) => {
    requireUser(req)
    const body = z
      .object({
        name: z.string().trim().min(1),
        arabic: z.string().optional(),
        deliveryFee: z.number().int().min(0),
      })
      .parse(req.body)
    const r = await prisma.restaurant.create({ data: body, include: restaurantInclude })
    return { restaurant: serializeRestaurant(r) }
  })

  app.patch('/api/restaurants/:id', async (req) => {
    requireUser(req)
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const body = z
      .object({
        name: z.string().trim().min(1).optional(),
        arabic: z.string().nullable().optional(),
        deliveryFee: z.number().int().min(0).optional(),
        active: z.boolean().optional(),
      })
      .parse(req.body)
    await loadRestaurant(id)
    const r = await prisma.restaurant.update({ where: { id }, data: body, include: restaurantInclude })
    return { restaurant: serializeRestaurant(r) }
  })

  app.post('/api/restaurants/:id/items', async (req) => {
    requireUser(req)
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const body = z
      .object({
        name: z.string().trim().min(1),
        arabic: z.string().optional(),
        price: z.number().int().min(0),
        kind: itemKind.default('plate'),
        sortOrder: z.number().int().optional(),
      })
      .parse(req.body)
    await loadRestaurant(id)
    await prisma.menuItem.create({ data: { ...body, restaurantId: id } })
    return { restaurant: serializeRestaurant(await loadRestaurant(id)) }
  })

  app.patch('/api/restaurants/:id/items/:itemId', async (req) => {
    requireUser(req)
    const { id, itemId } = z.object({ id: z.string(), itemId: z.string() }).parse(req.params)
    const body = z
      .object({
        name: z.string().trim().min(1).optional(),
        arabic: z.string().nullable().optional(),
        price: z.number().int().min(0).optional(),
        kind: itemKind.optional(),
        available: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
      .parse(req.body)
    const updated = await prisma.menuItem.updateMany({ where: { id: itemId, restaurantId: id }, data: body })
    if (updated.count === 0) throw notFound('Menu item')
    return { restaurant: serializeRestaurant(await loadRestaurant(id)) }
  })

  app.delete('/api/restaurants/:id/items/:itemId', async (req) => {
    requireUser(req)
    const { id, itemId } = z.object({ id: z.string(), itemId: z.string() }).parse(req.params)
    try {
      const removed = await prisma.menuItem.deleteMany({ where: { id: itemId, restaurantId: id } })
      if (removed.count === 0) throw notFound('Menu item')
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw conflict('Item is used by existing orders — set it unavailable instead')
      }
      throw e
    }
    return { restaurant: serializeRestaurant(await loadRestaurant(id)) }
  })
}
