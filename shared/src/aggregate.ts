import type {
  AggregateLine,
  CloseResult,
  OrderLine,
  Piaster,
  Restaurant,
  Session,
} from './types'

/**
 * Split a fixed delivery fee across `n` submitters so the shares sum to the
 * fee EXACTLY. Floor each share to the piaster, then hand the leftover units
 * out one-by-one. The first `remainder` people carry the extra piaster.
 *
 *   deliverySplit(3000, 14) -> four 215s + ten 214s  (sums to exactly 3000)
 */
export function deliverySplit(fee: Piaster, n: number): Piaster[] {
  if (n <= 0) return []
  const base = Math.floor(fee / n)
  const remainder = fee - base * n // 0..n-1
  return Array.from({ length: n }, (_, i) => (i < remainder ? base + 1 : base))
}

/** Roll every order line up into one vendor list: qty per item + notes w/ counts. */
export function rollup(session: Session, restaurant: Restaurant): AggregateLine[] {
  const byItem = new Map<string, AggregateLine>()
  for (const order of session.orders) {
    for (const line of order.lines) {
      const item = restaurant.menu.find((m) => m.id === line.itemId)
      if (!item) continue
      let agg = byItem.get(item.id)
      if (!agg) {
        agg = { itemId: item.id, name: item.name, arabic: item.arabic, qty: 0, notes: [] }
        byItem.set(item.id, agg)
      }
      agg.qty += line.qty
      if (line.note) {
        const existing = agg.notes.find((x) => x.note === line.note)
        if (existing) existing.count += line.qty
        else agg.notes.push({ note: line.note, count: line.qty })
      }
    }
  }
  const order = new Map(restaurant.menu.map((m, i) => [m.id, i]))
  return [...byItem.values()].sort((a, b) => order.get(a.itemId)! - order.get(b.itemId)!)
}

// Snapshot price wins (matches the server, which always bills the price at
// add time); the live menu price is only a fallback for snapshot-less fixtures.
const lineItemsTotal = (restaurant: Restaurant, line: OrderLine): Piaster => {
  if (line.unitPrice != null) return line.unitPrice * line.qty
  const item = restaurant.menu.find((m) => m.id === line.itemId)
  return item ? item.price * line.qty : 0
}

/** The full close: aggregate + per-person totals (items + fair delivery share). */
export function closeSession(session: Session, restaurant: Restaurant): CloseResult {
  const aggregate = rollup(session, restaurant)

  const orders = session.orders
  const headcount = orders.length // submitters = delivery denominator
  const shares = deliverySplit(restaurant.deliveryFee, headcount)

  const perPerson = orders.map((order, i) => {
    const itemsTotal = order.lines.reduce(
      (sum, l) => sum + lineItemsTotal(restaurant, l),
      0,
    )
    const deliveryShare = shares[i] ?? 0
    const forNames = [...new Set(order.lines.map((l) => l.forName).filter(Boolean) as string[])]
    return {
      person: order.person,
      itemsTotal,
      deliveryShare,
      total: itemsTotal + deliveryShare,
      paid: order.paid,
      forNames,
    }
  })

  const itemsGrandTotal = perPerson.reduce((s, p) => s + p.itemsTotal, 0)
  const grandTotal = itemsGrandTotal + restaurant.deliveryFee

  return {
    aggregate,
    itemsGrandTotal,
    deliveryFee: restaurant.deliveryFee,
    grandTotal,
    perPerson,
    headcount,
  }
}

/**
 * Invariant the whole product rests on: the sum of what each person owes must
 * equal (items grand total + delivery fee) to the piaster.
 */
export function verifyExact(result: CloseResult): boolean {
  const sumPeople = result.perPerson.reduce((s, p) => s + p.total, 0)
  const sumShares = result.perPerson.reduce((s, p) => s + p.deliveryShare, 0)
  return sumPeople === result.grandTotal && sumShares === result.deliveryFee
}
