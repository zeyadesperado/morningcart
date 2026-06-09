import { PrismaClient } from '@prisma/client'
import {
  RESTAURANTS,
  OPEN_SESSION,
  CLOSED_SESSION,
  type Session,
} from '@morningcart/shared'

const prisma = new PrismaClient()

// MenuItem ids collide across restaurants (short ids like 'foul','tea' repeat),
// so namespace them per restaurant to keep the DB primary key unique.
const itemDbId = (restaurantId: string, shortItemId: string): string =>
  `${restaurantId}__${shortItemId}`

// Office-local service date (Africa/Cairo) as 'YYYY-MM-DD'.
const cairoDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Cairo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const serviceDate = (d: Date = new Date()): string => cairoDate.format(d)

// Price snapshot for an el-sobhy short item id (unitPrice on each OrderLine).
const elSobhy = RESTAURANTS.find((r) => r.id === 'el-sobhy')
if (!elSobhy) throw new Error("seed: missing 'el-sobhy' fixture restaurant")

const elSobhyPrice = (shortItemId: string): number => {
  const item = elSobhy.menu.find((m) => m.id === shortItemId)
  if (!item) throw new Error(`seed: no el-sobhy menu item for '${shortItemId}'`)
  return item.price
}

async function seedSessionOrders(
  sessionId: string,
  session: Session,
): Promise<number> {
  let lineCount = 0
  for (const o of session.orders) {
    const created = await prisma.order.create({
      data: { sessionId, person: o.person, paid: o.paid },
    })
    for (const line of o.lines) {
      await prisma.orderLine.create({
        data: {
          orderId: created.id,
          menuItemId: itemDbId('el-sobhy', line.itemId),
          qty: line.qty,
          note: line.note ?? null,
          forName: line.forName ?? null,
          unitPrice: elSobhyPrice(line.itemId),
        },
      })
      lineCount++
    }
  }
  return lineCount
}

async function main(): Promise<void> {
  // Idempotent reset — delete in FK-safe order (children first).
  await prisma.orderLine.deleteMany()
  await prisma.order.deleteMany()
  await prisma.session.deleteMany()
  await prisma.menuItem.deleteMany()
  await prisma.restaurant.deleteMany()

  // Restaurants + their menus, with stable namespaced ids.
  let restaurantCount = 0
  let menuItemCount = 0
  for (const r of RESTAURANTS) {
    await prisma.restaurant.create({
      data: {
        id: r.id,
        name: r.name,
        arabic: r.arabic ?? null,
        deliveryFee: r.deliveryFee,
      },
    })
    restaurantCount++

    for (const [index, item] of r.menu.entries()) {
      await prisma.menuItem.create({
        data: {
          id: itemDbId(r.id, item.id),
          restaurantId: r.id,
          name: item.name,
          arabic: item.arabic ?? null,
          price: item.price,
          kind: item.kind,
          sortOrder: index,
          available: true,
        },
      })
      menuItemCount++
    }
  }

  const today = serviceDate()

  // Open session — this morning, mid-flow (El Sobhy).
  const openSession = await prisma.session.create({
    data: {
      restaurantId: 'el-sobhy',
      startedBy: OPEN_SESSION.startedBy,
      status: 'open',
      serviceDate: today,
    },
  })

  // Closed session — an earlier day, finalized (El Sobhy).
  const yesterday = serviceDate(new Date(Date.now() - 24 * 60 * 60 * 1000))
  const closedSession = await prisma.session.create({
    data: {
      restaurantId: 'el-sobhy',
      startedBy: CLOSED_SESSION.startedBy,
      status: 'closed',
      serviceDate: yesterday,
      closedAt: new Date(),
    },
  })

  let lineCount = 0
  lineCount += await seedSessionOrders(openSession.id, OPEN_SESSION)
  lineCount += await seedSessionOrders(closedSession.id, CLOSED_SESSION)

  const sessionCount = 2
  const orderCount = OPEN_SESSION.orders.length + CLOSED_SESSION.orders.length

  console.log(
    `Seeded ${restaurantCount} restaurants, ${menuItemCount} menu items, ` +
      `${sessionCount} sessions, ${orderCount} orders, ${lineCount} order lines.`,
  )
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
