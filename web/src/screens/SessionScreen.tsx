import { motion } from 'framer-motion'
import type { Order, Restaurant } from '../types'
import { AppHeader, Screen } from '../components/Shell'
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
  onClose,
  onRetry,
  onOrder,
  onSeeResult,
}: {
  restaurant: Restaurant
  orders: Order[]
  you: string
  variant: SessionVariant
  onClose: () => void
  onRetry: () => void
  onOrder: () => void
  onSeeResult: () => void
}) {
  const closed = variant === 'closed'
  const headerRight = <StatusBadge status={closed ? 'closed' : 'open'} />

  if (variant === 'loading') {
    return (
      <Screen scrollKey="session-loading">
        <AppHeader right={headerRight} />
        <div className="py-3"><Label>The table · {restaurant.name}</Label></div>
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
          body="Be the first to order from El Sobhy this morning. Others will trickle in."
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
      <div className="pb-3">
        <RosterHeader orders={orders} />
      </div>

      {!closed && (
        <div className="mb-2">
          <Button full variant="ghost" onClick={onOrder}>
            {orders.some((o) => o.person === you) ? '✎ Edit my order' : '＋ Add my order'}
          </Button>
        </div>
      )}

      {/* Close & aggregate — anyone can press it. The one button. */}
      {!closed ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-xl bg-clay-wash p-3 ring-1 ring-clay/20"
        >
          <Button full onClick={onClose} className="!py-3.5 text-base">
            Close &amp; aggregate →
          </Button>
          <p className="mt-2 text-center font-sans text-xs text-clay-deep">
            Anyone can close when most people are in — no owner, no waiting.
          </p>
        </motion.div>
      ) : (
        <div className="mb-4">
          <Button full variant="ghost" onClick={onSeeResult}>
            See the order &amp; who owes what →
          </Button>
        </div>
      )}

      <div className="space-y-1.5 pb-8">
        {orders.map((o, i) => (
          <OrderCard key={o.id} order={o} restaurant={restaurant} index={i} highlight={o.person === you} />
        ))}
      </div>
    </Screen>
  )
}
