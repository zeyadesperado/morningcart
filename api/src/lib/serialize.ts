import type { RestaurantFull, SessionFull } from '../db'

export function serializeRestaurant(r: RestaurantFull) {
  return {
    id: r.id,
    name: r.name,
    arabic: r.arabic,
    deliveryFee: r.deliveryFee,
    active: r.active,
    menu: r.menu.map((m) => ({
      id: m.id,
      name: m.name,
      arabic: m.arabic,
      price: m.price,
      kind: m.kind,
      available: m.available,
      sortOrder: m.sortOrder,
    })),
  }
}

/** Session DTO carries item names so the client can render the roster without a join. */
export function serializeSession(s: SessionFull, r: RestaurantFull) {
  const nameOf = new Map(r.menu.map((m) => [m.id, m]))
  return {
    id: s.id,
    restaurantId: s.restaurantId,
    startedBy: s.startedBy,
    status: s.status,
    serviceDate: s.serviceDate,
    createdAt: s.createdAt,
    closedAt: s.closedAt,
    restaurant: { id: r.id, name: r.name, arabic: r.arabic, deliveryFee: r.deliveryFee },
    orders: s.orders.map((o) => ({
      id: o.id,
      person: o.person,
      paid: o.paid,
      lines: o.lines.map((l) => ({
        menuItemId: l.menuItemId,
        name: nameOf.get(l.menuItemId)?.name ?? l.menuItemId,
        arabic: nameOf.get(l.menuItemId)?.arabic ?? null,
        qty: l.qty,
        note: l.note,
        forName: l.forName,
        unitPrice: l.unitPrice,
      })),
    })),
  }
}
