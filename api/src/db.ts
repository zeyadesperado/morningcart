import { Prisma, PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()

// Typed, reusable includes + their payload types.
export const sessionInclude = Prisma.validator<Prisma.SessionInclude>()({
  orders: { include: { lines: true }, orderBy: { createdAt: 'asc' } },
})
export const restaurantInclude = Prisma.validator<Prisma.RestaurantInclude>()({
  menu: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
})

export type SessionFull = Prisma.SessionGetPayload<{ include: typeof sessionInclude }>
export type RestaurantFull = Prisma.RestaurantGetPayload<{ include: typeof restaurantInclude }>
