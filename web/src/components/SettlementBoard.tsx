import { AnimatePresence, motion } from 'framer-motion'
import type { CloseResult } from '../types'
import { money } from '../lib/money'
import { Avatar, Label, Money, Stamp } from './ui'

// Outputs (b) per-person totals  +  (c) paid/unpaid checklist, in one board —
// the only "payment" surface there is. No ledger, no confirm, no balances.
export function SettlementBoard({
  result,
  onTogglePaid,
}: {
  result: CloseResult
  onTogglePaid: (person: string) => void
}) {
  const paidCount = result.perPerson.filter((p) => p.paid).length
  const collected = result.perPerson.filter((p) => p.paid).reduce((s, p) => s + p.total, 0)
  const allSettled = result.perPerson.length > 0 && paidCount === result.perPerson.length

  return (
    <section aria-label="Per-person totals and who has paid">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <Label>Who owes what · tap a row to mark paid</Label>
          <p className="mt-0.5 font-sans text-sm text-ink-soft">
            Split {result.headcount} ways · delivery EGP {money(result.deliveryFee)} shared fairly
          </p>
        </div>
        {allSettled ? (
          <AllSettled />
        ) : (
          <p className="shrink-0 text-right font-sans text-sm font-bold text-sage-deep">
            {paidCount}/{result.perPerson.length} paid
            <span className="block font-sans text-2xs font-medium text-ink-faint">
              EGP {money(collected)} collected
            </span>
          </p>
        )}
      </div>

      <ul className="overflow-hidden rounded-lg ring-1 ring-line">
        {result.perPerson.map((p, i) => (
          <li key={p.person} className={i > 0 ? 'border-t border-line/70' : ''}>
            {/* the whole 56px row is the toggle — not just a 5.4rem pill */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.985 }}
              onClick={() => onTogglePaid(p.person)}
              aria-pressed={p.paid}
              aria-label={`Mark ${p.person} as ${p.paid ? 'unpaid' : 'paid'} — owes ${money(p.total)} pounds`}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                p.paid ? 'bg-sage-wash/60' : i % 2 ? 'bg-wash/60' : 'bg-card-raised'
              } hover:bg-wash`}
            >
              <Avatar name={p.person} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-sans text-sm font-bold text-ink">{p.person}</span>
                  {p.forNames.length > 0 && (
                    <span className="font-sans text-2xs font-semibold text-[#8a5e16]">+ {p.forNames.join(', ')}</span>
                  )}
                </div>
                <p className="tnum whitespace-nowrap font-sans text-2xs text-ink-faint">
                  {money(p.itemsTotal)} + {money(p.deliveryShare)} delivery
                </p>
              </div>

              <Money p={p.total} className="text-base font-bold text-ink" />

              <span className="inline-flex w-[5rem] items-center justify-center" aria-hidden>
                <AnimatePresence mode="popLayout" initial={false}>
                  {p.paid ? (
                    <motion.span
                      key="paid"
                      initial={{ scale: 2.2, rotate: -18, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 700, damping: 28 }}
                    >
                      <Stamp>Paid</Stamp>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="notyet"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="rounded-full bg-card px-2.5 py-1 font-sans text-2xs font-semibold text-ink-soft ring-1 ring-inset ring-line-strong"
                    >
                      ○ Not yet
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </motion.button>
          </li>
        ))}
      </ul>
    </section>
  )
}

// brass ray burst — the Mark's geometry as on-brand confetti, zero deps
function AllSettled() {
  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      className="relative shrink-0 text-right"
    >
      <svg viewBox="0 0 40 40" className="absolute -right-2 -top-5 h-10 w-10" aria-hidden fill="none">
        {[...Array(8)].map((_, i) => (
          <motion.line
            key={i}
            x1="20"
            y1="14"
            x2="20"
            y2="4"
            className="stroke-brass"
            strokeWidth="2.4"
            strokeLinecap="round"
            transform={`rotate(${i * 45} 20 20)`}
            initial={{ pathLength: 0, opacity: 0.9 }}
            animate={{ pathLength: 1, opacity: 0 }}
            transition={{ delay: 0.15 + i * 0.03, duration: 0.7, ease: 'easeOut' }}
          />
        ))}
      </svg>
      <p className="font-sans text-sm font-bold text-sage-deep">
        All settled ✓ <span lang="ar">صحتين</span>
      </p>
      <span className="block font-sans text-2xs font-medium text-ink-faint">everyone's in the clear</span>
    </motion.div>
  )
}
