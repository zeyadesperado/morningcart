// ── Domain types ────────────────────────────────────────────────────────────
// Money is carried as integer piasters (1 EGP = 100) so splits are exact and
// never drift. Format only at the edge (see money.ts). Single source of truth
// for both /api (authoritative) and /web.

export type Piaster = number // integer

export type ItemKind = 'plate' | 'drink' | 'extra'

export interface MenuItem {
  id: string
  name: string
  /** price in piasters */
  price: Piaster
  /** display-only grouping; NOT an admin concept (no categories in setup) */
  kind: ItemKind
  arabic?: string
  available?: boolean
}

export interface Restaurant {
  id: string
  name: string
  arabic?: string
  /** fixed, known in advance — split equally across submitters at close */
  deliveryFee: Piaster
  menu: MenuItem[]
}

export interface OrderLine {
  itemId: string
  qty: number
  note?: string
  /** order-on-behalf — never adds a delivery head */
  forName?: string
}

export interface Order {
  id: string
  person: string
  lines: OrderLine[]
  /** the only "payment" state there is */
  paid: boolean
  joinedAt?: number
}

export type SessionStatus = 'open' | 'closed'

export interface Session {
  id: string
  restaurantId: string
  startedBy: string
  status: SessionStatus
  dateLabel: string
  orders: Order[]
}

// ── Derived (computed at close) ──────────────────────────────────────────────

export interface AggregateLine {
  itemId: string
  name: string
  arabic?: string
  qty: number
  notes: { note: string; count: number }[]
}

export interface PersonTotal {
  person: string
  itemsTotal: Piaster
  deliveryShare: Piaster
  total: Piaster
  paid: boolean
  forNames: string[]
}

export interface CloseResult {
  aggregate: AggregateLine[]
  itemsGrandTotal: Piaster
  deliveryFee: Piaster
  /** = itemsGrandTotal + deliveryFee — the buyer's out-of-pocket */
  grandTotal: Piaster
  perPerson: PersonTotal[]
  /** number of submitters = delivery denominator */
  headcount: number
}
