import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError, type OrderLineInput } from './client'

export const keys = {
  me: ['me'] as const,
  colleagues: ['colleagues'] as const,
  restaurants: ['restaurants'] as const,
  session: (id: string) => ['session', id] as const,
}

const POLL = 7000

export function useMe() {
  return useQuery({ queryKey: keys.me, queryFn: api.me, staleTime: 30_000 })
}
export function useColleagues() {
  return useQuery({ queryKey: keys.colleagues, queryFn: api.colleagues, staleTime: Infinity })
}
export function useRestaurants() {
  return useQuery({ queryKey: keys.restaurants, queryFn: api.restaurants })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.login(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  })
}
export function useLogout() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: () => api.logout(), onSuccess: () => qc.invalidateQueries() })
}

/** the current open session (any restaurant), polled. 404 -> no session today. */
export function useOpenSession() {
  return useQuery({
    queryKey: ['session', 'open'],
    queryFn: () =>
      api
        .openSession()
        .then((r) => r.session)
        .catch((e) => {
          if (e instanceof ApiError && e.status === 404) return null // no open session today
          throw e
        }),
    retry: false,
    refetchInterval: POLL,
  })
}

export function useStartSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (restaurantId: string) => api.startSession(restaurantId),
    onSuccess: (data) => qc.setQueryData(['session', 'open'], data.session), // seed -> no flicker
  })
}

export function useUpsertOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { sessionId: string; lines: OrderLineInput[] }) => api.upsertOrder(v.sessionId, v.lines),
    onSuccess: (data) => {
      qc.setQueryData(['session', 'open'], data.session)
      qc.invalidateQueries({ queryKey: ['session'] })
    },
  })
}

export function useCloseSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => api.closeSession(sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session'] }),
  })
}

export function useTogglePaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { orderId: string; paid: boolean }) => api.togglePaid(v.orderId, v.paid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session'] }),
  })
}

export function useRestaurantMutations() {
  const qc = useQueryClient()
  const done = () => qc.invalidateQueries({ queryKey: keys.restaurants })
  return {
    create: useMutation({ mutationFn: api.createRestaurant, onSuccess: done }),
    patch: useMutation({
      mutationFn: (v: { id: string; data: Parameters<typeof api.patchRestaurant>[1] }) => api.patchRestaurant(v.id, v.data),
      onSuccess: done,
    }),
    addItem: useMutation({
      mutationFn: (v: { id: string; data: Parameters<typeof api.addItem>[1] }) => api.addItem(v.id, v.data),
      onSuccess: done,
    }),
    patchItem: useMutation({
      mutationFn: (v: { id: string; itemId: string; data: Parameters<typeof api.patchItem>[2] }) =>
        api.patchItem(v.id, v.itemId, v.data),
      onSuccess: done,
    }),
    deleteItem: useMutation({
      mutationFn: (v: { id: string; itemId: string }) => api.deleteItem(v.id, v.itemId),
      onSuccess: done,
    }),
  }
}
