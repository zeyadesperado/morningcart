import { useEffect, useState } from 'react'
import { animate, motion, useReducedMotion } from 'framer-motion'
import type { CloseResult, Restaurant } from '../types'
import { verifyExact } from '../lib/aggregate'
import { money } from '../lib/money'
import { AppHeader, Screen, ThumbDock } from '../components/Shell'
import { StatusBadge } from '../components/StatusBadge'
import { CopyButton, useCopyTicket, VendorTicket } from '../components/VendorTicket'
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

// the grand total counts up as the receipt prints
function CountUpMoney({ to }: { to: number }) {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(reduced ? to : 0)
  useEffect(() => {
    if (reduced) {
      setShown(to)
      return
    }
    const controls = animate(0, to, {
      duration: 0.7,
      delay: 0.5,
      ease: 'easeOut',
      onUpdate: (v) => setShown(Math.round(v)),
    })
    return () => controls.stop()
  }, [to, reduced])
  return <span className="tnum">{money(shown)}</span>
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
  const dockCopy = useCopyTicket(result, restaurant)

  if (variant === 'loading') {
    return (
      <Screen scrollKey="result-loading">
        <AppHeader right={<StatusBadge status="closed" />} />
        <div className="py-3">
          <Label>Closing the order…</Label>
        </div>
        {/* the wind-up: close latency becomes the printer warming up */}
        <div className="ticket ticket-perf mb-4 rounded-lg px-5 py-6 shadow-card">
          <p className="font-mono text-sm font-semibold text-ink-soft">
            Printing the order
            <motion.span
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              aria-hidden
            >
              …
            </motion.span>
          </p>
        </div>
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
      <AppHeader right={<StatusBadge status="closed" />} />
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.div variants={rise} className="pb-4 pt-1">
          <Label>
            Closed · {result.headcount} people · {restaurant.name}
          </Label>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink text-balance">
            One order. Sorted.
          </h1>
          <p className="mt-1 font-sans text-sm text-ink-soft">
            Total EGP <CountUpMoney to={result.grandTotal} /> — copy it to the vendor, then collect from the table
            below.
          </p>
        </motion.div>

        {/* the climax: the receipt prints out of a brass slot */}
        <motion.div variants={rise}>
          <div className="relative">
            <div className="absolute -top-1.5 left-3 right-3 h-1.5 rounded-full bg-brass/50" aria-hidden />
            <motion.div
              initial={{ clipPath: 'inset(0 0 100% 0)' }}
              animate={{ clipPath: 'inset(0 0 0% 0)' }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
            >
              <VendorTicket result={result} restaurant={restaurant} />
            </motion.div>
          </div>
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

      {/* the collector lives at the bottom of a 14-row list — keep Copy in the thumb */}
      <ThumbDock>
        <div className="flex items-center gap-3 rounded-xl bg-ink/95 p-2.5 pl-4 shadow-lift ring-1 ring-ink">
          <div className="min-w-0 flex-1">
            <p className="font-sans text-2xs font-bold uppercase tracking-[0.14em] text-paper/60">For WhatsApp</p>
            <p className="tnum truncate font-display text-lg font-semibold leading-tight text-card-raised">
              EGP {money(result.grandTotal)}
            </p>
          </div>
          <CopyButton copied={dockCopy.copied} onCopy={dockCopy.copy} label="Copy the order" />
        </div>
      </ThumbDock>
    </Screen>
  )
}
