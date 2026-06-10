import type { CloseResult, ItemKind } from '@morningcart/shared'

// All requests go to /api — in dev via Vite proxy, in prod via the nginx
// reverse proxy — so cookies are always same-origin.
const BASE = '/api'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  // Only declare a JSON body when one is actually present — Fastify rejects an
  // empty body sent with Content-Type: application/json (e.g. bodyless POST /close).
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string> | undefined) }
  if (init?.body != null && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
  const res = await fetch(BASE + path, {
    credentials: 'include',
    ...init,
    headers,
  })
  if (!res.ok) {
    let message = res.statusText || 'The kitchen didn’t answer — try again.'
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

const body = (v: unknown) => JSON.stringify(v)

// ── DTOs (mirror api/src/lib/serialize.ts) ───────────────────────────────────
export interface MenuItemDTO {
  id: string
  name: string
  arabic: string | null
  price: number
  kind: ItemKind
  available: boolean
  sortOrder: number
}
export interface RestaurantDTO {
  id: string
  name: string
  arabic: string | null
  deliveryFee: number
  active: boolean
  menu: MenuItemDTO[]
}
export interface OrderLineDTO {
  menuItemId: string
  name: string
  arabic: string | null
  qty: number
  note: string | null
  forName: string | null
  unitPrice: number
}
export interface OrderDTO {
  id: string
  person: string
  paid: boolean
  lines: OrderLineDTO[]
}
export interface SessionDTO {
  id: string
  restaurantId: string
  startedBy: string
  status: 'open' | 'closed'
  serviceDate: string
  createdAt: string
  closedAt: string | null
  /** full restaurant incl. menu — sessions stay renderable even if the
   *  restaurant is later soft-deleted out of the /restaurants list.
   *  deliveryFee here is the session's snapshot, not the live fee. */
  restaurant: RestaurantDTO
  orders: OrderDTO[]
}
export interface ResultDTO {
  sessionId: string
  status: 'open' | 'closed'
  serviceDate: string
  restaurant: { id: string; name: string; arabic: string | null; deliveryFee: number }
  result: CloseResult
}
export interface OrderLineInput {
  menuItemId: string
  qty: number
  note?: string
  forName?: string
}

// ── Endpoints ────────────────────────────────────────────────────────────────
export const api = {
  me: () => req<{ user: string | null }>('/auth/me'),
  colleagues: () => req<{ colleagues: string[] }>('/colleagues'),
  login: (name: string) => req<{ user: string }>('/auth/login', { method: 'POST', body: body({ name }) }),
  logout: () => req<{ ok: true }>('/auth/logout', { method: 'POST' }),

  restaurants: () => req<{ restaurants: RestaurantDTO[] }>('/restaurants'),
  createRestaurant: (data: { name: string; arabic?: string; deliveryFee: number }) =>
    req<{ restaurant: RestaurantDTO }>('/restaurants', { method: 'POST', body: body(data) }),
  patchRestaurant: (id: string, data: Partial<{ name: string; arabic: string | null; deliveryFee: number; active: boolean }>) =>
    req<{ restaurant: RestaurantDTO }>(`/restaurants/${id}`, { method: 'PATCH', body: body(data) }),
  addItem: (id: string, data: { name: string; arabic?: string; price: number; kind?: ItemKind; sortOrder?: number }) =>
    req<{ restaurant: RestaurantDTO }>(`/restaurants/${id}/items`, { method: 'POST', body: body(data) }),
  patchItem: (id: string, itemId: string, data: Partial<{ name: string; price: number; kind: ItemKind; available: boolean; arabic: string | null; sortOrder: number }>) =>
    req<{ restaurant: RestaurantDTO }>(`/restaurants/${id}/items/${itemId}`, { method: 'PATCH', body: body(data) }),
  deleteItem: (id: string, itemId: string) =>
    req<{ restaurant: RestaurantDTO }>(`/restaurants/${id}/items/${itemId}`, { method: 'DELETE' }),

  openSession: (restaurantId?: string) =>
    req<{ session: SessionDTO }>(`/sessions/open${restaurantId ? `?restaurantId=${restaurantId}` : ''}`),
  /** today's session, open OR closed — keeps the settlement reachable for everyone */
  currentSession: () => req<{ session: SessionDTO }>('/sessions/current'),
  cancelSession: (sessionId: string) => req<{ ok: true }>(`/sessions/${sessionId}`, { method: 'DELETE' }),
  startSession: (restaurantId: string) =>
    req<{ session: SessionDTO }>('/sessions', { method: 'POST', body: body({ restaurantId }) }),
  session: (id: string) => req<{ session: SessionDTO }>(`/sessions/${id}`),
  upsertOrder: (sessionId: string, lines: OrderLineInput[]) =>
    req<{ session: SessionDTO }>(`/sessions/${sessionId}/order`, { method: 'PUT', body: body({ lines }) }),
  deleteOrder: (sessionId: string) =>
    req<{ session: SessionDTO }>(`/sessions/${sessionId}/order`, { method: 'DELETE' }),
  closeSession: (sessionId: string) =>
    req<ResultDTO>(`/sessions/${sessionId}/close`, { method: 'POST' }),
  result: (sessionId: string) => req<ResultDTO>(`/sessions/${sessionId}/result`),

  togglePaid: (orderId: string, paid: boolean) =>
    req<{ order: { id: string; person: string; paid: boolean } }>(`/orders/${orderId}`, {
      method: 'PATCH',
      body: body({ paid }),
    }),
}
