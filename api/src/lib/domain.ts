import {
  deliverySplit,
  rollup,
  type CloseResult,
  type Restaurant as SharedRestaurant,
  type Session as SharedSession,
} from '@morningcart/shared'
import type { RestaurantFull, SessionFull } from '../db'
import { env } from '../env'

/** YYYY-MM-DD in office-local time. */
export function serviceDateToday(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: env.OFFICE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(new Date())
}

export function toSharedRestaurant(r: RestaurantFull): SharedRestaurant {
  return {
    id: r.id,
    name: r.name,
    arabic: r.arabic ?? undefined,
    deliveryFee: r.deliveryFee,
    menu: r.menu.map((m) => ({
      id: m.id,
      name: m.name,
      arabic: m.arabic ?? undefined,
      price: m.price,
      kind: m.kind as SharedRestaurant['menu'][number]['kind'],
      available: m.available,
    })),
  }
}

export function toSharedSession(s: SessionFull): SharedSession {
  return {
    id: s.id,
    restaurantId: s.restaurantId,
    startedBy: s.startedBy,
    status: s.status as SharedSession['status'],
    dateLabel: s.serviceDate,
    orders: s.orders.map((o) => ({
      id: o.id,
      person: o.person,
      paid: o.paid,
      lines: o.lines.map((l) => ({
        itemId: l.menuItemId,
        qty: l.qty,
        note: l.note ?? undefined,
        forName: l.forName ?? undefined,
      })),
    })),
  }
}

/**
 * Authoritative close computation. Reuses the shared, canonical, price-independent
 * pieces (rollup for the vendor list, deliverySplit for the fee) but computes each
 * person's itemsTotal from the SNAPSHOTTED OrderLine.unitPrice, so a later menu
 * price edit can never alter a historical bill.
 * Invariant: Σ(perPerson.total) === itemsGrandTotal + deliveryFee, to the piaster.
 */
export function computeResult(session: SessionFull, restaurant: RestaurantFull): CloseResult {
  const aggregate = rollup(toSharedSession(session), toSharedRestaurant(restaurant))
  const orders = session.orders
  const headcount = orders.length // submitters = delivery denominator
  const shares = deliverySplit(restaurant.deliveryFee, headcount)

  const perPerson = orders.map((o, i) => {
    const itemsTotal = o.lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0)
    const deliveryShare = shares[i] ?? 0
    const forNames = [...new Set(o.lines.map((l) => l.forName).filter((x): x is string => !!x))]
    return {
      person: o.person,
      itemsTotal,
      deliveryShare,
      total: itemsTotal + deliveryShare,
      paid: o.paid,
      forNames,
    }
  })

  const itemsGrandTotal = perPerson.reduce((s, p) => s + p.itemsTotal, 0)
  return {
    aggregate,
    itemsGrandTotal,
    deliveryFee: restaurant.deliveryFee,
    grandTotal: itemsGrandTotal + restaurant.deliveryFee,
    perPerson,
    headcount,
  }
}
