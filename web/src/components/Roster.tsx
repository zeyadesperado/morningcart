import { motion } from 'framer-motion'
import type { Order, Restaurant } from '../types'
import { Avatar } from './ui'

export function lineSummary(order: Order, r: Restaurant): string {
  return order.lines
    .map((l) => {
      const item = r.menu.find((m) => m.id === l.itemId)
      const name = item?.name ?? l.itemId
      const q = l.qty > 1 ? `${l.qty} ` : ''
      const forr = l.forName ? ` → ${l.forName}` : ''
      return `${q}${name}${forr}`
    })
    .join(' · ')
}

// "14 in" — the warm, alive heartbeat of an open session.
export function RosterHeader({ orders }: { orders: Order[] }) {
  const shown = orders.slice(-6)
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2.5">
        {shown.map((o, i) => (
          <motion.span
            key={o.id}
            initial={{ scale: 0, x: 6 }}
            animate={{ scale: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 24, delay: i * 0.04 }}
            className="ring-2 ring-paper rounded-full"
          >
            <Avatar name={o.person} size="sm" />
          </motion.span>
        ))}
      </div>
      <p className="font-sans text-sm text-ink-soft" aria-live="polite">
        <span className="font-display text-xl font-semibold text-ink">{orders.length}</span>{' '}
        <span className="font-semibold">in</span> this morning
      </p>
    </div>
  )
}

export function OrderCard({
  order,
  restaurant,
  index = 0,
  highlight = false,
}: {
  order: Order
  restaurant: Restaurant
  index?: number
  highlight?: boolean
}) {
  const forNames = [...new Set(order.lines.map((l) => l.forName).filter(Boolean))] as string[]
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.035, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className={`flex items-start gap-3 rounded-lg px-3 py-2.5 ${
        highlight ? 'bg-clay-wash ring-1 ring-clay/25' : 'bg-card/60'
      }`}
    >
      <Avatar name={order.person} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-sans text-sm font-bold text-ink">{order.person}</span>
          {highlight && <span className="font-sans text-2xs font-bold uppercase tracking-wide text-clay-deep">you</span>}
          {forNames.length > 0 && (
            <span className="rounded-full bg-brass-wash px-1.5 py-0.5 font-sans text-2xs font-semibold text-[#8a5e16]">
              +1 for {forNames.join(', ')}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate font-sans text-sm text-ink-soft">{lineSummary(order, restaurant)}</p>
      </div>
    </motion.div>
  )
}
