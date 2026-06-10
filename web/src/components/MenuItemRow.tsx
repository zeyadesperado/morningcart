import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { MenuItem } from '../types'
import { Money, KindDot } from './ui'
import { QtyStepper } from './QtyStepper'

export interface LineDraft {
  qty: number
  note?: string
  forName?: string
}

export function MenuItemRow({
  item,
  draft,
  onChange,
}: {
  item: MenuItem
  draft: LineDraft
  onChange: (d: LineDraft) => void
}) {
  const inCart = draft.qty > 0
  const [showNote, setShowNote] = useState(!!draft.note)
  const [showFor, setShowFor] = useState(!!draft.forName)

  return (
    <motion.li
      layout
      className={`rounded-lg px-3 py-2.5 transition-colors ${
        inCart ? 'bg-clay-wash/70 ring-1 ring-clay/15' : 'hover:bg-wash/70'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <KindDot kind={item.kind} />
            <span className="truncate font-sans text-base font-semibold text-ink">{item.name}</span>
            {item.arabic && (
              <span className="truncate font-sans text-sm text-ink-faint" dir="rtl">
                {item.arabic}
              </span>
            )}
          </div>
          <div className="mt-0.5 pl-3.5">
            <Money p={item.price} className="text-sm font-medium text-ink-soft" />
          </div>
        </div>

        {inCart ? (
          <QtyStepper value={draft.qty} label={item.name} onChange={(qty) => onChange({ ...draft, qty })} />
        ) : (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange({ ...draft, qty: 1 })}
            aria-label={`Add ${item.name}`}
            className="tap rounded-full bg-card px-4 py-2 font-sans text-sm font-bold text-clay-deep ring-1 ring-clay/25 transition-colors hover:bg-clay hover:text-card-raised"
          >
            Add
          </motion.button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {inCart && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-2 pl-3.5 pt-2.5">
              {!showNote && (
                <Chip onClick={() => setShowNote(true)}>＋ note</Chip>
              )}
              {!showFor && (
                <Chip onClick={() => setShowFor(true)}>＋ for someone</Chip>
              )}
              {showNote && (
                <input
                  autoFocus
                  onFocus={(e) => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' })}
                  value={draft.note ?? ''}
                  onChange={(e) => onChange({ ...draft, note: e.target.value })}
                  placeholder="من غير زيت · no sugar…"
                  aria-label={`Note for ${item.name}`}
                  className="min-w-0 flex-1 rounded-md bg-card-raised px-2.5 py-1.5 font-sans text-sm text-ink ring-1 ring-line-bold placeholder:text-ink-faint focus:ring-clay"
                />
              )}
              {showFor && (
                <div className="inline-flex items-center gap-1 rounded-md bg-brass-wash px-2 py-1 ring-1 ring-brass/30">
                  <span className="font-sans text-xs font-semibold text-[#8a5e16]">for</span>
                  <input
                    autoFocus
                    onFocus={(e) => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' })}
                    value={draft.forName ?? ''}
                    onChange={(e) => onChange({ ...draft, forName: e.target.value })}
                    placeholder="Ziad"
                    aria-label={`Order ${item.name} on behalf of`}
                    className="w-20 rounded bg-transparent font-sans text-sm font-semibold text-ink placeholder:text-ink-faint"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap rounded-full px-3 py-2 font-sans text-xs font-semibold text-ink-soft ring-1 ring-line-strong transition-colors hover:bg-card-raised hover:text-ink"
    >
      {children}
    </button>
  )
}
