import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Order, Restaurant } from '../types'
import { AppHeader, Screen, ThumbDock } from '../components/Shell'
import { StatusBadge } from '../components/StatusBadge'
import { RosterHeader, OrderCard } from '../components/Roster'
import { Button } from '../components/Button'
import { SkeletonList, EmptyState, ErrorState } from '../components/States'
import { Label } from '../components/ui'

export type SessionVariant = 'default' | 'loading' | 'empty' | 'error' | 'closed'

export function SessionScreen({
  restaurant,
  orders,
  you,
  variant,
  closePending = false,
  justSubmitted = false,
  onClose,
  onCancelSession,
  onStartAnother,
  onRetry,
  onOrder,
  onSeeResult,
}: {
  restaurant: Restaurant
  orders: Order[]
  you: string
  variant: SessionVariant
  closePending?: boolean
  /** I just placed my order — land it on the table with a little ceremony */
  justSubmitted?: boolean
  onClose: () => void
  /** present only while the table is empty — abandon a session nobody joined */
  onCancelSession?: () => void
  /** closed variant only — kick off a second round the same morning */
  onStartAnother?: () => void
  onRetry: () => void
  onOrder: () => void
  onSeeResult: () => void
}) {
  const closed = variant === 'closed'
  const headerRight = <StatusBadge status={closed ? 'closed' : 'open'} />
  const iHaveOrdered = orders.some((o) => o.person === you)

  // sleepy-tap safety: closing is a group-wide act — first tap arms, second closes
  const [confirmClose, setConfirmClose] = useState(false)
  useEffect(() => {
    if (!confirmClose) return
    const t = setTimeout(() => setConfirmClose(false), 3500)
    return () => clearTimeout(t)
  }, [confirmClose])

  // "☕ {name} just joined" — polling streams arrivals; whisper the newest one
  const prevNames = useRef<Set<string> | null>(null)
  const [justJoined, setJustJoined] = useState<string | null>(null)
  useEffect(() => {
    const names = new Set(orders.map((o) => o.person))
    if (prevNames.current) {
      const fresh = [...names].filter((n) => !prevNames.current!.has(n) && n !== you)
      if (fresh.length > 0) {
        setJustJoined(fresh[fresh.length - 1])
        const t = setTimeout(() => setJustJoined(null), 2500)
        return () => clearTimeout(t)
      }
    }
    prevNames.current = names
  }, [orders, you])
  useEffect(() => {
    prevNames.current = new Set(orders.map((o) => o.person))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (variant === 'loading') {
    return (
      <Screen scrollKey="session-loading">
        <AppHeader right={headerRight} />
        <div className="py-3">
          <Label>The table · {restaurant.name}</Label>
        </div>
        <SkeletonList rows={6} />
      </Screen>
    )
  }

  if (variant === 'empty') {
    return (
      <Screen scrollKey="session-empty">
        <AppHeader right={headerRight} />
        <EmptyState
          icon="🍳"
          title="The table’s set — no one’s in yet"
          body={`Be the first to order from ${restaurant.name} this morning. Others will trickle in.`}
          action={{ label: 'Add my order', onClick: onOrder }}
        />
      </Screen>
    )
  }

  if (variant === 'error') {
    return (
      <Screen scrollKey="session-error">
        <AppHeader right={headerRight} />
        <ErrorState what="load the table" onRetry={onRetry} />
      </Screen>
    )
  }

  return (
    <Screen scrollKey="session">
      <AppHeader right={headerRight} />
      <div className="flex items-end justify-between gap-3 pb-1 pt-1">
        <div>
          <Label>The table · {restaurant.name}</Label>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">
            {closed ? 'Order’s closed' : 'Who’s in'}
          </h1>
        </div>
      </div>
      <div className="pb-1">
        <RosterHeader orders={orders} />
      </div>
      <div className="h-6">
        <AnimatePresence>
          {justJoined && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="font-sans text-xs font-semibold text-[#8a5e16]"
            >
              ☕ {justJoined} just joined
            </motion.p>
          )}
          {justSubmitted && !justJoined && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="font-sans text-xs font-semibold text-clay-deep"
            >
              You’re in ☕ — change it any time before the order closes
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Close the order — anyone can, but never by accident. */}
      {!closed ? (
        orders.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl bg-clay-wash p-3 ring-1 ring-clay/20"
          >
            {!confirmClose ? (
              <Button full variant="soft" onClick={() => setConfirmClose(true)} className="!py-3.5 text-base">
                Close the order →
              </Button>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex gap-2"
              >
                <Button full onClick={onClose} disabled={closePending} className="!py-3.5">
                  {closePending ? 'Closing…' : `Close for ${orders.length} ✓`}
                </Button>
                <Button variant="ghost" onClick={() => setConfirmClose(false)} className="!py-3.5">
                  Keep ordering
                </Button>
              </motion.div>
            )}
            <p className="mt-2 text-center font-sans text-xs text-clay-deep">
              {confirmClose
                ? `This locks everyone’s order — all ${orders.length} of them.`
                : 'Anyone can close when most people are in — no owner, no waiting.'}
            </p>
          </motion.div>
        ) : (
          onCancelSession && (
            <div className="mb-4">
              <Button full variant="ghost" onClick={onCancelSession}>
                Nobody’s hungry? Call off this breakfast
              </Button>
            </div>
          )
        )
      ) : (
        onStartAnother && (
          <button
            onClick={onStartAnother}
            className="tap mb-2 w-full py-1 text-center font-sans text-sm font-semibold text-ink-soft"
          >
            Closed too soon? ☀ Start another breakfast
          </button>
        )
      )}

      <div className="space-y-1.5 pb-2">
        {orders.map((o, i) => (
          <OrderCard
            key={o.id}
            order={o}
            restaurant={restaurant}
            index={i}
            highlight={o.person === you}
            landing={justSubmitted && o.person === you}
          />
        ))}
      </div>

      {/* thumb zone: my action on an open table, the payoff on a closed one */}
      <ThumbDock>
        {closed ? (
          <Button full onClick={onSeeResult} className="!py-3.5 text-base shadow-lift">
            See the order &amp; who owes what →
          </Button>
        ) : (
          <Button full variant={iHaveOrdered ? 'ghost' : 'primary'} onClick={onOrder} className="!py-3.5 text-base shadow-lift">
            {iHaveOrdered ? '✎ Edit my order' : '＋ Add my order'}
          </Button>
        )}
      </ThumbDock>
    </Screen>
  )
}
