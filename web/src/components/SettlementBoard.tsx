import { motion } from 'framer-motion'
import type { CloseResult } from '../types'
import { money } from '../lib/money'
import { Avatar, Label, Money } from './ui'

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

  return (
    <section aria-label="Per-person totals and who has paid">
      <div className="mb-2 flex items-end justify-between">
        <div>
          <Label>Who owes what · tap to mark paid</Label>
          <p className="mt-0.5 font-sans text-sm text-ink-soft">
            Split {result.headcount} ways · delivery EGP {money(result.deliveryFee)} shared fairly
          </p>
        </div>
        <p className="shrink-0 text-right font-sans text-sm font-bold text-sage-deep">
          {paidCount}/{result.perPerson.length} paid
          <span className="block font-sans text-2xs font-medium text-ink-faint">
            EGP {money(collected)} collected
          </span>
        </p>
      </div>

      <ul className="overflow-hidden rounded-lg ring-1 ring-line">
        {result.perPerson.map((p, i) => (
          <li
            key={p.person}
            className={`flex items-center gap-3 px-3 py-2.5 ${
              i % 2 ? 'bg-card/50' : 'bg-card-raised/60'
            } ${i > 0 ? 'border-t border-line/70' : ''}`}
          >
            <Avatar name={p.person} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-sans text-sm font-bold text-ink">{p.person}</span>
                {p.forNames.length > 0 && (
                  <span className="font-sans text-2xs font-semibold text-[#8a5e16]">+ {p.forNames.join(', ')}</span>
                )}
              </div>
              <p className="tnum font-sans text-xs text-ink-faint">
                {money(p.itemsTotal)} items + {money(p.deliveryShare)} delivery
              </p>
            </div>

            <Money p={p.total} className="text-base font-bold text-ink" />

            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => onTogglePaid(p.person)}
              aria-pressed={p.paid}
              aria-label={`Mark ${p.person} as ${p.paid ? 'unpaid' : 'paid'}`}
              className={`tap inline-flex w-[5.4rem] items-center justify-center gap-1 rounded-full px-2 py-1.5 font-sans text-2xs font-bold uppercase tracking-wide ring-1 ring-inset transition-colors ${
                p.paid
                  ? 'bg-sage-wash text-sage-deep ring-sage/40'
                  : 'bg-card text-ink-soft ring-line-strong hover:bg-wash'
              }`}
            >
              <span aria-hidden>{p.paid ? '✓' : '○'}</span>
              {p.paid ? 'Paid' : 'Unpaid'}
            </motion.button>
          </li>
        ))}
      </ul>
    </section>
  )
}
