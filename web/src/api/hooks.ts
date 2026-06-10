import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError, type OrderLineInput, type ResultDTO } from './client'

export const keys = {
  me: ['me'] as const,
  colleagues: ['colleagues'] as const,
  restaurants: ['restaurants'] as const,
  current: ['session', 'current'] as const,
  result: (id: string) => ['result', id] as const,
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
    meta: { silentError: true }, // LoginScreen renders the failure inline
  })
}
export function useLogout() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: () => api.logout(), onSuccess: () => qc.invalidateQueries() })
}

/** today's session — open OR closed — polled. 404 -> no breakfast yet today. */
export function useCurrentSession() {
  return useQuery({
    queryKey: keys.current,
    queryFn: () =>
      api
        .currentSession()
        .then((r) => r.session)
        .catch((e) => {
          if (e instanceof ApiError && e.status === 404) return null // nothing today
          throw e
        }),
    retry: false,
    refetchInterval: POLL,
  })
}

/** the settlement for a session — server-computed, shared by everyone. */
export function useSessionResult(sessionId: string | undefined) {
  return useQuery({
    queryKey: keys.result(sessionId ?? 'none'),
    queryFn: () => api.result(sessionId!),
    enabled: !!sessionId,
    refetchInterval: POLL, // paid checkmarks update across phones
  })
}

export function useStartSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (restaurantId: string) => api.startSession(restaurantId),
    onSuccess: (data) => qc.setQueryData(keys.current, data.session), // seed -> no flicker
  })
}

export function useUpsertOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { sessionId: string; lines: OrderLineInput[] }) => api.upsertOrder(v.sessionId, v.lines),
    onSuccess: (data) => {
      qc.setQueryData(keys.current, data.session)
      qc.invalidateQueries({ queryKey: ['session'] })
    },
    meta: { silentError: true }, // ComposeScreen shows the RetryBanner
  })
}

export function useDeleteOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => api.deleteOrder(sessionId),
    onSuccess: (data) => {
      qc.setQueryData(keys.current, data.session)
      qc.invalidateQueries({ queryKey: ['session'] })
    },
  })
}

export function useCloseSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => api.closeSession(sessionId),
    onSuccess: (data) => {
      qc.setQueryData(keys.result(data.sessionId), data) // closer sees it instantly
      qc.invalidateQueries({ queryKey: ['session'] })
    },
  })
}

export function useCancelSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => api.cancelSession(sessionId),
    onSuccess: () => {
      qc.setQueryData(keys.current, null)
      qc.invalidateQueries({ queryKey: ['session'] })
    },
  })
}

export function useTogglePaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { orderId: string; paid: boolean }) => api.togglePaid(v.orderId, v.paid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session'] })
      qc.invalidateQueries({ queryKey: ['result'] })
    },
  })
}

export type { ResultDTO }

export function useRestaurantMutations() {
  const qc = useQueryClient()
  // menus render from BOTH the restaurants list and the session DTO
  const done = () => {
    qc.invalidateQueries({ queryKey: keys.restaurants })
    qc.invalidateQueries({ queryKey: ['session'] })
  }
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
