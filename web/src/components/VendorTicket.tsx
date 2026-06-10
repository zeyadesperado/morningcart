import { useState } from 'react'
import { motion } from 'framer-motion'
import type { CloseResult, Restaurant } from '../types'
import { money } from '../lib/money'
import { aggregateToText } from '../lib/format'
import { Label } from './ui'

const KIND_LABEL: Record<string, string> = { plate: 'Plates', drink: 'Drinks', extra: 'Extras' }

export type CopyState = 'idle' | 'ok' | 'fail'

/** Copy-the-ticket behavior, shared by the ticket header and the thumb dock. */
export function useCopyTicket(result: CloseResult, restaurant: Restaurant) {
  const [copied, setCopied] = useState<CopyState>('idle')
  const copy = async () => {
    const text = aggregateToText(result, restaurant)
    let ok = false
    try {
      await navigator.clipboard.writeText(text)
      ok = true
    } catch {
      // navigator.clipboard needs a secure context — on plain-HTTP LAN (the
      // office reality) fall back to the legacy textarea trick
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        ok = document.execCommand('copy')
        ta.remove()
      } catch {
        ok = false
      }
    }
    setCopied(ok ? 'ok' : 'fail') // never flash success for a failed copy
    setTimeout(() => setCopied('idle'), 1900)
  }
  return { copied, copy }
}

export function VendorTicket({ result, restaurant }: { result: CloseResult; restaurant: Restaurant }) {
  const { copied, copy } = useCopyTicket(result, restaurant)
  const kindOf = (id: string) => restaurant.menu.find((m) => m.id === id)?.kind ?? 'plate'
  const order: Array<'plate' | 'drink' | 'extra'> = ['plate', 'drink', 'extra']

  return (
    <motion.div
      // tear-off: a successful copy gives the receipt a little tug
      animate={copied === 'ok' ? { rotate: [0, -0.7, 0.5, 0], y: [0, 2, 0] } : {}}
      transition={{ duration: 0.35 }}
      className="ticket ticket-perf rounded-lg px-5 py-5 shadow-card"
    >
      <span className="sr-only" role="status" aria-live="polite">
        {copied === 'ok' ? 'Order copied to clipboard' : copied === 'fail' ? 'Copy failed' : ''}
      </span>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label>The order · for the vendor</Label>
          <h3 className="mt-1 font-display text-xl font-semibold text-ink">
            {restaurant.name}{' '}
            <span className="font-sans text-sm font-medium text-ink-faint" dir="rtl" lang="ar">
              {restaurant.arabic}
            </span>
          </h3>
        </div>
        <CopyButton copied={copied} onCopy={copy} />
      </div>

      <div className="mt-4 font-mono text-sm text-ink">
        {order.map((kind) => {
          const group = result.aggregate.filter((a) => kindOf(a.itemId) === kind)
          if (!group.length) return null
          return (
            <div key={kind} className="mb-3">
              <p className="mb-1 font-sans text-2xs font-bold uppercase tracking-[0.16em] text-ink-faint">
                {KIND_LABEL[kind]}
              </p>
              {group.map((a) => (
                <div key={a.itemId} className="flex items-baseline gap-2 py-0.5">
                  <span className="tnum w-8 shrink-0 font-bold text-clay-deep">{a.qty}×</span>
                  <span className="flex-1 font-semibold">{a.name}</span>
                  {a.notes.length > 0 && (
                    <span className="text-right text-xs text-ink-faint">
                      {a.notes.map((n) => `${n.count} ${n.note}`).join(', ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <div className="rule-dashed mt-1 pt-3 font-mono text-sm">
        <div className="flex justify-between text-ink-soft">
          <span>Food</span>
          <span className="tnum">{money(result.itemsGrandTotal)}</span>
        </div>
        <div className="flex justify-between text-ink-soft">
          <span>Delivery</span>
          <span className="tnum">{money(result.deliveryFee)}</span>
        </div>
        <div className="mt-1 flex justify-between font-display text-lg font-semibold text-ink">
          <span>Total</span>
          <span className="tnum">EGP {money(result.grandTotal)}</span>
        </div>
      </div>
    </motion.div>
  )
}

export function CopyButton({
  copied,
  onCopy,
  label = 'Copy',
}: {
  copied: CopyState
  onCopy: () => void
  label?: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onCopy}
      whileTap={{ scale: 0.95 }}
      aria-label="Copy the order to send on WhatsApp"
      className={`tap shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 font-sans text-sm font-bold ring-1 transition-colors ${
        copied === 'ok'
          ? 'bg-sage text-card-raised ring-sage-deep'
          : copied === 'fail'
            ? 'bg-clay-deep text-card-raised ring-clay-deep'
            : 'bg-ink text-card-raised ring-ink hover:bg-ink/90'
      }`}
    >
      {copied === 'ok' ? (
        <motion.span initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="inline-block">
          ✓ Copied
        </motion.span>
      ) : copied === 'fail' ? (
        '✗ Couldn’t copy'
      ) : (
        label
      )}
    </motion.button>
  )
}
