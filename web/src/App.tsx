import { useState } from 'react'
import { MotionConfig } from 'framer-motion'
import type { CloseResult, Order, Restaurant } from './types'
import type { LineDraft } from './components/MenuItemRow'
import type { OrderDTO, OrderLineInput, ResultDTO, RestaurantDTO, SessionDTO } from './api/client'
import {
  useCloseSession,
  useLogout,
  useMe,
  useOpenSession,
  useRestaurantMutations,
  useRestaurants,
  useStartSession,
  useTogglePaid,
  useUpsertOrder,
} from './api/hooks'
import { AppHeader, GrainFilm, Screen } from './components/Shell'
import { SkeletonList } from './components/States'
import { AppNav } from './components/AppNav'
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
const toOrder = (o: OrderDTO): Order => ({
  id: o.id,
  person: o.person,
  paid: o.paid,
  lines: o.lines.map((l) => ({
    itemId: l.menuItemId,
    qty: l.qty,
    note: l.note ?? undefined,
    forName: l.forName ?? undefined,
  })),
})
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
      </div>
    </MotionConfig>
  )
}

type View = 'home' | 'compose' | 'session' | 'result' | 'setup'

function Authed({ you }: { you: string }) {
  const restaurantsQ = useRestaurants()
  const openQ = useOpenSession()
  const start = useStartSession()
  const close = useCloseSession()
  const togglePaid = useTogglePaid()
  const logout = useLogout()
  const rmut = useRestaurantMutations()

  const restaurants = restaurantsQ.data?.restaurants ?? []
  const openSession: SessionDTO | undefined = openQ.data ?? undefined
  const fullDto = (id: string) => restaurants.find((r) => r.id === id)

  const [view, setView] = useState<View>('home')
  const [setupId, setSetupId] = useState<string | null>(null)
  const [closed, setClosed] = useState<{ res: ResultDTO; orders: OrderDTO[] } | null>(null)
  const [closingId, setClosingId] = useState<string | null>(null)

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
        />
        {nav}
      </>
    )
  }

  // ── RESULT ─────────────────────────────────────────────────────────────────
  if (view === 'result') {
    const restDto = closed ? fullDto(closed.res.restaurant.id) : undefined
    const restaurant: Restaurant = restDto
      ? toRestaurant(restDto)
      : { id: '', name: closed?.res.restaurant.name ?? '', deliveryFee: 0, menu: [] }

    if (close.isError && !closed) {
      return (
        <>
          <ResultScreen
            result={ZERO_RESULT}
            restaurant={restaurant}
            variant="error"
            onTogglePaid={() => {}}
            onRetry={() => closingId && close.mutate(closingId, { onSuccess: (res) => setClosed({ res, orders: [] }) })}
          />
          {nav}
        </>
      )
    }
    if (!closed || close.isPending) {
      return (
        <>
          <ResultScreen result={ZERO_RESULT} restaurant={restaurant} variant="loading" onTogglePaid={() => {}} onRetry={() => {}} />
          {nav}
        </>
      )
    }
    const onTogglePaid = (person: string) => {
      const order = closed.orders.find((o) => o.person === person)
      if (!order) return
      const nextPaid = !order.paid
      setClosed((prev) =>
        prev
          ? {
              res: {
                ...prev.res,
                result: {
                  ...prev.res.result,
                  perPerson: prev.res.result.perPerson.map((p) => (p.person === person ? { ...p, paid: nextPaid } : p)),
                },
              },
              orders: prev.orders.map((o) => (o.person === person ? { ...o, paid: nextPaid } : o)),
            }
          : prev,
      )
      togglePaid.mutate(
        { orderId: order.id, paid: nextPaid },
        {
          onError: () =>
            setClosed((prev) =>
              prev
                ? {
                    res: {
                      ...prev.res,
                      result: {
                        ...prev.res.result,
                        perPerson: prev.res.result.perPerson.map((p) =>
                          p.person === person ? { ...p, paid: !nextPaid } : p,
                        ),
                      },
                    },
                    orders: prev.orders.map((o) => (o.person === person ? { ...o, paid: !nextPaid } : o)),
                  }
                : prev,
            ),
        },
      )
    }
    return (
      <>
        <ResultScreen result={closed.res.result} restaurant={restaurant} variant="default" onTogglePaid={onTogglePaid} onRetry={() => {}} />
        {nav}
      </>
    )
  }

  // ── NO OPEN SESSION -> START ─────────────────────────────────────────────────
  if (!openSession) {
    if (openQ.isLoading || restaurantsQ.isLoading) return <Splash />
    return (
      <>
        <StartScreen
          restaurants={restaurants.map(toRestaurant)}
          you={you}
          onStart={(rid) => start.mutate(rid, { onSuccess: () => setView('session') })}
        />
        {nav}
      </>
    )
  }

  // ── OPEN SESSION present ─────────────────────────────────────────────────────
  const restDto = fullDto(openSession.restaurantId)
  if (!restDto) return <Splash />
  const restaurant = toRestaurant(restDto)
  const iHaveOrdered = openSession.orders.some((o) => o.person === you)

  // a newly-arrived user with no order goes straight to composing
  if (view === 'compose' || (view === 'home' && !iHaveOrdered)) {
    return (
      <>
        <ComposeView
          session={openSession}
          restaurant={restaurant}
          you={you}
          onSubmitted={() => setView('session')}
          onGoTable={() => setView('session')}
          onGoSetup={() => setView('setup')}
        />
        {nav}
      </>
    )
  }

  // default: the table (covers 'home' + 'session')
  return (
    <>
      <SessionScreen
        restaurant={restaurant}
        orders={openSession.orders.map(toOrder)}
        you={you}
        variant="default"
        onClose={() => {
          setClosingId(openSession.id)
          setView('result')
          close.mutate(openSession.id, { onSuccess: (res) => setClosed({ res, orders: openSession.orders }) })
        }}
        onRetry={() => openQ.refetch()}
        onOrder={() => setView('compose')}
        onSeeResult={() => setView('result')}
      />
      {nav}
    </>
  )
}

// ── Compose wrapper: owns the draft (seeded from my existing order) + mutation ─
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
  const mine = session.orders.find((o) => o.person === you)
  const [draft, setDraft] = useState<Record<string, LineDraft>>(() =>
    mine
      ? Object.fromEntries(
          mine.lines.map((l) => [l.menuItemId, { qty: l.qty, note: l.note ?? undefined, forName: l.forName ?? undefined }]),
        )
      : {},
  )

  const lines: OrderLineInput[] = restaurant.menu
    .filter((m) => (draft[m.id]?.qty ?? 0) > 0)
    .map((m) => ({ menuItemId: m.id, qty: draft[m.id].qty, note: draft[m.id].note, forName: draft[m.id].forName }))

  const submit = () => {
    if (!lines.length) return
    upsert.mutate({ sessionId: session.id, lines }, { onSuccess: onSubmitted })
  }

  const variant = restaurant.menu.length === 0 ? 'empty' : upsert.isError ? 'submit-error' : 'default'

  return (
    <ComposeScreen
      restaurant={restaurant}
      you={you}
      draft={draft}
      onDraftChange={(itemId, d) => setDraft((p) => ({ ...p, [itemId]: d }))}
      variant={variant}
      onSubmit={submit}
      onRetry={submit}
      onEdit={() => {}}
      onGoTable={onGoTable}
      onGoSetup={onGoSetup}
    />
  )
}
