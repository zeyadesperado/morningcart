import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import type { CloseResult, Restaurant } from './types'
import type { LineDraft } from './components/MenuItemRow'
import { ApiError, type OrderLineInput, type RestaurantDTO, type ResultDTO, type SessionDTO } from './api/client'
import {
  keys,
  useCancelSession,
  useCloseSession,
  useCurrentSession,
  useDeleteOrder,
  useLogout,
  useMe,
  useRestaurantMutations,
  useRestaurants,
  useSessionResult,
  useStartSession,
  useTogglePaid,
  useUpsertOrder,
} from './api/hooks'
import { AppHeader, GrainFilm, Screen } from './components/Shell'
import { ErrorState, SkeletonList } from './components/States'
import { AppNav } from './components/AppNav'
import { ErrorToast } from './components/Toast'
import { Label } from './components/ui'
import { ComposeScreen } from './screens/ComposeScreen'
import { SessionScreen } from './screens/SessionScreen'
import { ResultScreen } from './screens/ResultScreen'
import { SetupScreen } from './screens/SetupScreen'
import { StartScreen } from './screens/StartScreen'
import { LoginScreen } from './screens/LoginScreen'

// ── DTO -> shared domain mappers ─────────────────────────────────────────────
const toRestaurant = (d: RestaurantDTO): Restaurant => ({
  id: d.id,
  name: d.name,
  arabic: d.arabic ?? undefined,
  deliveryFee: d.deliveryFee,
  menu: d.menu.map((m) => ({
    id: m.id,
    name: m.name,
    arabic: m.arabic ?? undefined,
    price: m.price,
    kind: m.kind,
    available: m.available,
  })),
})
const toOrders = (s: SessionDTO) =>
  s.orders.map((o) => ({
    id: o.id,
    person: o.person,
    paid: o.paid,
    lines: o.lines.map((l) => ({
      itemId: l.menuItemId,
      qty: l.qty,
      note: l.note ?? undefined,
      forName: l.forName ?? undefined,
      unitPrice: l.unitPrice,
    })),
  }))
const ZERO_RESULT: CloseResult = {
  aggregate: [],
  itemsGrandTotal: 0,
  deliveryFee: 0,
  grandTotal: 0,
  perPerson: [],
  headcount: 0,
}

function Splash() {
  return (
    <Screen scrollKey="splash">
      <AppHeader />
      <div className="py-6">
        <Label className="pb-3">Setting the table…</Label>
        <SkeletonList rows={6} />
      </div>
    </Screen>
  )
}

export default function App() {
  const me = useMe()
  const user = me.data?.user ?? null
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-[100dvh] w-full">
        <GrainFilm />
        {me.isLoading ? <Splash /> : !user ? <LoginScreen /> : <Authed you={user} />}
        <ErrorToast />
      </div>
    </MotionConfig>
  )
}

type View = 'home' | 'compose' | 'session' | 'result' | 'setup'

function Authed({ you }: { you: string }) {
  const restaurantsQ = useRestaurants()
  const currentQ = useCurrentSession()
  const start = useStartSession()
  const close = useCloseSession()
  const cancelSession = useCancelSession()
  const logout = useLogout()
  const rmut = useRestaurantMutations()

  const restaurants = restaurantsQ.data?.restaurants ?? []
  const session: SessionDTO | undefined = currentQ.data ?? undefined

  const [view, setView] = useState<View>('home')
  const [setupId, setSetupId] = useState<string | null>(null)
  // closed-table escape hatch: show StartScreen again for a second round today
  const [startAnother, setStartAnother] = useState(false)
  // "you're in" — one short beat of ceremony after submitting
  const [justSubmitted, setJustSubmitted] = useState(false)
  useEffect(() => {
    if (!justSubmitted) return
    const t = setTimeout(() => setJustSubmitted(false), 2200)
    return () => clearTimeout(t)
  }, [justSubmitted])

  const nav = (
    <AppNav you={you} onHome={() => setView('home')} onSetup={() => setView('setup')} onLogout={() => logout.mutate()} />
  )

  // ── SETUP ──────────────────────────────────────────────────────────────────
  if (view === 'setup') {
    const activeId = setupId ?? restaurants[0]?.id ?? ''
    return (
      <>
        <SetupScreen
          restaurants={restaurants}
          activeId={activeId}
          loading={restaurantsQ.isLoading}
          onSelect={setSetupId}
          onAddRestaurant={() => rmut.create.mutate({ name: 'New restaurant', deliveryFee: 2500 })}
          onPatchRestaurant={(id, data) => rmut.patch.mutate({ id, data })}
          onAddItem={(id) => rmut.addItem.mutate({ id, data: { name: 'New item', price: 0, kind: 'plate' } })}
          onPatchItem={(id, itemId, data) => rmut.patchItem.mutate({ id, itemId, data })}
          onRemoveItem={(id, itemId) => rmut.deleteItem.mutate({ id, itemId })}
          onDeleteRestaurant={(id) => {
            const r = restaurants.find((x) => x.id === id)
            if (!window.confirm(`Delete “${r?.name ?? 'this restaurant'}”? The team won't be able to order from it anymore.`)) return
            rmut.patch.mutate({ id, data: { active: false } })
            setSetupId(null)
          }}
        />
        {nav}
      </>
    )
  }

  // ── network trouble (a real error, not just "no session yet") ──────────────
  if (currentQ.isError) {
    return (
      <>
        <Screen scrollKey="home-error">
          <AppHeader />
          <ErrorState what="load this morning’s table" onRetry={() => currentQ.refetch()} />
        </Screen>
        {nav}
      </>
    )
  }

  // ── NO SESSION TODAY (or starting a second round) -> START ─────────────────
  if (!session || (session.status === 'closed' && startAnother)) {
    if (currentQ.isLoading || restaurantsQ.isLoading) return <Splash />
    return (
      <>
        <StartScreen
          restaurants={restaurants.map(toRestaurant)}
          you={you}
          onStart={(rid) =>
            start.mutate(rid, {
              onSuccess: () => {
                setStartAnother(false)
                setView('session')
              },
            })
          }
          onGoSetup={() => setView('setup')}
        />
        {nav}
      </>
    )
  }

  const restaurant = toRestaurant(session.restaurant) // session carries its own menu — never depends on the active-only list
  const closed = session.status === 'closed'

  // ── RESULT (reachable by EVERYONE, open-or-closed, survives refresh) ───────
  if (view === 'result') {
    return (
      <>
        <ResultView session={session} restaurant={restaurant} />
        {nav}
      </>
    )
  }

  // ── CLOSED -> the table shows the outcome, result one tap away ─────────────
  if (closed) {
    return (
      <>
        <SessionScreen
          restaurant={restaurant}
          orders={toOrders(session)}
          you={you}
          variant="closed"
          onClose={() => {}}
          onStartAnother={() => setStartAnother(true)}
          onRetry={() => currentQ.refetch()}
          onOrder={() => {}}
          onSeeResult={() => setView('result')}
        />
        {nav}
      </>
    )
  }

  const iHaveOrdered = session.orders.some((o) => o.person === you)

  // a newly-arrived user with no order goes straight to composing
  if (view === 'compose' || (view === 'home' && !iHaveOrdered)) {
    return (
      <>
        <ComposeView
          session={session}
          restaurant={restaurant}
          you={you}
          onSubmitted={() => {
            setJustSubmitted(true)
            setView('session')
          }}
          onGoTable={() => setView('session')}
          onGoSetup={() => setView('setup')}
        />
        {nav}
      </>
    )
  }

  // default: the open table (covers 'home' + 'session')
  return (
    <>
      <SessionScreen
        restaurant={restaurant}
        orders={toOrders(session)}
        you={you}
        variant="default"
        closePending={close.isPending}
        justSubmitted={justSubmitted}
        onClose={() => close.mutate(session.id, { onSuccess: () => setView('result') })}
        onCancelSession={
          session.orders.length === 0
            ? () => cancelSession.mutate(session.id, { onSuccess: () => setView('home') })
            : undefined
        }
        onRetry={() => currentQ.refetch()}
        onOrder={() => setView('compose')}
        onSeeResult={() => setView('result')}
      />
      {nav}
    </>
  )
}

// ── Result wrapper: server-computed settlement + optimistic paid toggles ─────
function ResultView({ session, restaurant }: { session: SessionDTO; restaurant: Restaurant }) {
  const qc = useQueryClient()
  const resultQ = useSessionResult(session.id)
  const togglePaid = useTogglePaid()

  if (resultQ.isError) {
    return (
      <ResultScreen
        result={ZERO_RESULT}
        restaurant={restaurant}
        variant="error"
        onTogglePaid={() => {}}
        onRetry={() => resultQ.refetch()}
      />
    )
  }
  const res = resultQ.data
  if (!res) {
    return <ResultScreen result={ZERO_RESULT} restaurant={restaurant} variant="loading" onTogglePaid={() => {}} onRetry={() => {}} />
  }

  const onTogglePaid = (person: string) => {
    const order = session.orders.find((o) => o.person === person)
    const entry = res.result.perPerson.find((p) => p.person === person)
    if (!order || !entry) return
    const nextPaid = !entry.paid
    qc.setQueryData<ResultDTO>(keys.result(session.id), (prev) =>
      prev
        ? {
            ...prev,
            result: {
              ...prev.result,
              perPerson: prev.result.perPerson.map((p) => (p.person === person ? { ...p, paid: nextPaid } : p)),
            },
          }
        : prev,
    )
    togglePaid.mutate(
      { orderId: order.id, paid: nextPaid },
      { onError: () => qc.invalidateQueries({ queryKey: keys.result(session.id) }) }, // roll back to server truth
    )
  }

  return <ResultScreen result={res.result} restaurant={restaurant} variant="default" onTogglePaid={onTogglePaid} onRetry={() => {}} />
}

// ── Compose wrapper: owns the draft (seeded from my order, kept in
//    sessionStorage so a pull-to-refresh or tab death can't eat it) ───────────
function ComposeView({
  session,
  restaurant,
  you,
  onSubmitted,
  onGoTable,
  onGoSetup,
}: {
  session: SessionDTO
  restaurant: Restaurant
  you: string
  onSubmitted: () => void
  onGoTable: () => void
  onGoSetup: () => void
}) {
  const upsert = useUpsertOrder()
  const removeOrder = useDeleteOrder()
  const rmut = useRestaurantMutations()
  const mine = session.orders.find((o) => o.person === you)
  const storageKey = `draft:${session.id}:${you}`
  const [draft, setDraft] = useState<Record<string, LineDraft>>(() => {
    try {
      const saved = sessionStorage.getItem(storageKey)
      if (saved) return JSON.parse(saved)
    } catch {
      /* private mode / quota — in-memory only */
    }
    return mine
      ? Object.fromEntries(
          mine.lines.map((l) => [l.menuItemId, { qty: l.qty, note: l.note ?? undefined, forName: l.forName ?? undefined }]),
        )
      : {}
  })
  const changeDraft = (itemId: string, d: LineDraft) =>
    setDraft((p) => {
      const next = { ...p, [itemId]: d }
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  const clearDraft = () => {
    try {
      sessionStorage.removeItem(storageKey)
    } catch {
      /* ignore */
    }
  }

  const lines: OrderLineInput[] = restaurant.menu
    .filter((m) => (draft[m.id]?.qty ?? 0) > 0)
    .map((m) => ({ menuItemId: m.id, qty: draft[m.id].qty, note: draft[m.id].note, forName: draft[m.id].forName }))

  const submit = () => {
    if (!lines.length) return
    upsert.mutate(
      { sessionId: session.id, lines },
      {
        onSuccess: () => {
          clearDraft()
          onSubmitted()
        },
      },
    )
  }

  // quick-added items land at the end of the menu, not on top of it
  const nextSortOrder = session.restaurant.menu.reduce((mx, m) => Math.max(mx, m.sortOrder), -1) + 1

  const justClosed = upsert.error instanceof ApiError && upsert.error.status === 409
  const variant = restaurant.menu.length === 0 ? 'empty' : justClosed ? 'just-closed' : upsert.isError ? 'submit-error' : 'default'

  return (
    <ComposeScreen
      restaurant={restaurant}
      you={you}
      draft={draft}
      onDraftChange={changeDraft}
      variant={variant}
      onSubmit={submit}
      onRetry={submit}
      onGoTable={onGoTable}
      onGoSetup={onGoSetup}
      onAddMenuItem={(d) => rmut.addItem.mutateAsync({ id: restaurant.id, data: { ...d, sortOrder: nextSortOrder } })}
      onRemoveOrder={
        mine
          ? () =>
              removeOrder.mutate(session.id, {
                onSuccess: () => {
                  clearDraft()
                  onGoTable()
                },
              })
          : undefined
      }
    />
  )
}
