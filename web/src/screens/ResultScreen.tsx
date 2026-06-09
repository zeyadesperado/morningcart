import { motion } from 'framer-motion'
import type { CloseResult, Restaurant } from '../types'
import { verifyExact } from '../lib/aggregate'
import { AppHeader, Screen } from '../components/Shell'
import { StatusBadge } from '../components/StatusBadge'
import { VendorTicket } from '../components/VendorTicket'
import { SettlementBoard } from '../components/SettlementBoard'
import { SkeletonList, ErrorState } from '../components/States'
import { Label } from '../components/ui'

export type ResultVariant = 'default' | 'loading' | 'error'

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
}
const rise = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export function ResultScreen({
  result,
  restaurant,
  variant,
  onTogglePaid,
  onRetry,
}: {
  result: CloseResult
  restaurant: Restaurant
  variant: ResultVariant
  onTogglePaid: (person: string) => void
  onRetry: () => void
}) {
  if (variant === 'loading') {
    return (
      <Screen scrollKey="result-loading">
        <AppHeader right={<StatusBadge status="closed" />} />
        <div className="py-3"><Label>Rolling everything up…</Label></div>
        <div className="mb-4 h-40 animate-shimmer rounded-lg skeleton" />
        <SkeletonList rows={5} />
      </Screen>
    )
  }

  if (variant === 'error') {
    return (
      <Screen scrollKey="result-error">
        <AppHeader right={<StatusBadge status="closed" />} />
        <ErrorState what="aggregate the order" onRetry={onRetry} />
      </Screen>
    )
  }

  const exact = verifyExact(result)

  return (
    <Screen scrollKey="result">
      <AppHeader right={<StatusBadge status="placed" />} />
      <motion.div variants={stagger} initial="hidden" animate="show" className="pb-10">
        <motion.div variants={rise} className="pb-4 pt-1">
          <Label>Closed · {result.headcount} people · {restaurant.name}</Label>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink text-balance">
            One order. Sorted.
          </h1>
          <p className="mt-1 font-sans text-sm text-ink-soft">
            Copy it to the vendor, then collect from the table below.
          </p>
        </motion.div>

        <motion.div variants={rise}>
          <VendorTicket result={result} restaurant={restaurant} />
        </motion.div>

        <motion.div variants={rise} className="mt-6">
          <SettlementBoard result={result} onTogglePaid={onTogglePaid} />
          <p
            className={`mt-2 flex items-center gap-1.5 px-1 font-sans text-xs ${
              exact ? 'text-sage-deep' : 'text-clay-deep'
            }`}
          >
            <span aria-hidden>{exact ? '✓' : '⚠'}</span>
            {exact
              ? 'Per-person totals balance to the vendor total — exact to the piaster.'
              : 'Totals do not balance — check the split.'}
          </p>
        </motion.div>
      </motion.div>
    </Screen>
  )
}
