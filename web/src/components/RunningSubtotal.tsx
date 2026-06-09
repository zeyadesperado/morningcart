import { AnimatePresence, motion } from 'framer-motion'
import { money } from '../lib/money'
import type { Piaster } from '../types'
import { Button } from './Button'

// Persistent, always-visible subtotal that lives in the thumb zone.
export function RunningSubtotal({
  subtotal,
  itemCount,
  ctaLabel,
  onCta,
  disabled,
}: {
  subtotal: Piaster
  itemCount: number
  ctaLabel: string
  onCta: () => void
  disabled?: boolean
}) {
  return (
    <div className="pointer-events-none sticky bottom-0 z-30 -mx-4 mt-2 px-4 pb-4 pt-3">
      <div className="absolute inset-x-0 bottom-0 h-[120%] bg-gradient-to-t from-paper via-paper/95 to-transparent" />
      <div className="pointer-events-auto relative flex items-center gap-3 rounded-xl bg-ink/95 p-2.5 pl-4 shadow-lift ring-1 ring-ink">
        <div className="flex-1">
          <p aria-hidden className="font-sans text-2xs font-bold uppercase tracking-[0.14em] text-paper/60">
            Your subtotal · {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </p>
          <span className="sr-only" role="status" aria-live="polite">
            Subtotal {money(subtotal)} Egyptian pounds, {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
          <div aria-hidden className="flex items-baseline gap-1 text-card-raised">
            <span className="font-sans text-xs font-semibold text-paper/70">EGP</span>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={subtotal}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                className="tnum font-display text-2xl font-semibold leading-none"
              >
                {money(subtotal)}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
        <Button onClick={onCta} disabled={disabled} className="shrink-0">
          {ctaLabel}
        </Button>
      </div>
    </div>
  )
}
