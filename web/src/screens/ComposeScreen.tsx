import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ItemKind, MenuItem, Restaurant } from '../types'
import { egp } from '../lib/money'
import type { LineDraft } from '../components/MenuItemRow'
import { MenuItemRow } from '../components/MenuItemRow'
import { RunningSubtotal } from '../components/RunningSubtotal'
import { AppHeader, Screen } from '../components/Shell'
import { StatusBadge } from '../components/StatusBadge'
import { SkeletonList, EmptyState, ErrorState, RetryBanner } from '../components/States'
import { Avatar, Label, Money } from '../components/ui'

export type ComposeVariant = 'default' | 'loading' | 'empty' | 'error' | 'submit-error' | 'summary' | 'closed'

const KIND_LABEL: Record<string, string> = { plate: 'Plates', drink: 'Drinks', extra: 'Extras' }
const KIND_ORDER: Array<'plate' | 'drink' | 'extra'> = ['plate', 'drink', 'extra']

export function ComposeScreen({
  restaurant,
  you,
  draft,
  onDraftChange,
  variant,
  onSubmit,
  onRetry,
  onEdit,
  onGoTable,
  onGoSetup,
  onAddMenuItem,
  onRemoveOrder,
}: {
  restaurant: Restaurant
  you: string
  draft: Record<string, LineDraft>
  onDraftChange: (itemId: string, d: LineDraft) => void
  variant: ComposeVariant
  onSubmit: () => void
  onRetry: () => void
  onEdit: () => void
  onGoTable: () => void
  onGoSetup: () => void
  onAddMenuItem: (data: { name: string; price: number; kind: ItemKind }) => Promise<unknown>
  /** present when I already have a submitted order — cancelling frees my delivery share */
  onRemoveOrder?: () => void
}) {
  const lineFor = (id: string): LineDraft => draft[id] ?? { qty: 0 }
  const subtotal = restaurant.menu.reduce((s, m) => s + lineFor(m.id).qty * m.price, 0)
  const itemCount = restaurant.menu.reduce((s, m) => s + lineFor(m.id).qty, 0)

  const youChip = (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-card-raised px-2 py-1 ring-1 ring-line">
      <Avatar name={you} size="sm" />
      <span className="pr-1 font-sans text-xs font-semibold text-ink-soft">{you}</span>
    </span>
  )

  const TitleRow = (
    <div className="flex items-end justify-between gap-3 pb-3">
      <div>
        <Label>This morning</Label>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          What are you<br />having?
        </h1>
        <p className="mt-1 font-sans text-sm text-ink-soft">
          from <span className="font-semibold text-ink">{restaurant.name}</span>{' '}
          <span dir="rtl" className="text-ink-faint">{restaurant.arabic}</span>
        </p>
      </div>
      <StatusBadge status="open" />
    </div>
  )

  if (variant === 'loading') {
    return (
      <Screen scrollKey="compose-loading">
        <AppHeader right={youChip} />
        {TitleRow}
        <SkeletonList rows={7} />
      </Screen>
    )
  }

  if (variant === 'empty') {
    return (
      <Screen scrollKey="compose-empty">
        <AppHeader right={youChip} />
        <EmptyState
          icon="📝"
          title="No menu yet for this place"
          body="Someone needs to add the items and prices once in Setup — then ordering is instant."
          action={{ label: 'Open Setup', onClick: onGoSetup }}
        />
      </Screen>
    )
  }

  if (variant === 'error') {
    return (
      <Screen scrollKey="compose-error">
        <AppHeader right={youChip} />
        <ErrorState what="load the menu" onRetry={onRetry} />
      </Screen>
    )
  }

  // submitted summary OR closed read-only
  if (variant === 'summary' || variant === 'closed') {
    const mine = restaurant.menu
      .map((m) => ({ m, d: lineFor(m.id) }))
      .filter((x) => x.d.qty > 0)
    const closed = variant === 'closed'
    return (
      <Screen scrollKey="compose-summary">
        <AppHeader right={youChip} />
        <div className="flex items-end justify-between gap-3 pb-4">
          <div>
            <Label>{closed ? 'Ordering closed' : 'You’re in'}</Label>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
              {closed ? 'Your order' : 'Locked in ☕'}
            </h1>
          </div>
          <StatusBadge status={closed ? 'closed' : 'open'} />
        </div>
        <div className="rounded-xl bg-card-raised p-4 shadow-card ring-1 ring-line">
          <ul className="divide-y divide-line/70">
            {mine.map(({ m, d }) => (
              <li key={m.id} className="flex items-baseline gap-2 py-2">
                <span className="tnum w-6 font-bold text-clay-deep">{d.qty}×</span>
                <span className="flex-1 font-sans text-base font-semibold text-ink">
                  {m.name}
                  {d.note && <span className="font-normal text-ink-faint"> · {d.note}</span>}
                  {d.forName && <span className="font-semibold text-[#8a5e16]"> · for {d.forName}</span>}
                </span>
                <Money p={m.price * d.qty} className="text-sm font-semibold text-ink-soft" />
              </li>
            ))}
          </ul>
          <div className="rule-dashed mt-2 flex items-baseline justify-between pt-3">
            <span className="font-sans text-sm font-semibold text-ink-soft">Your items</span>
            <Money p={subtotal} unit className="font-display text-xl font-semibold text-ink" />
          </div>
        </div>
        <p className="mt-3 px-1 font-sans text-sm text-ink-soft">
          {closed
            ? 'The order’s been closed and sent. Final cost lands on the table view.'
            : 'You can change this until someone closes the order.'}
        </p>
        <div className="mt-auto flex gap-2 pb-5 pt-4">
          {!closed && (
            <button
              onClick={onEdit}
              className="tap flex-1 rounded-lg bg-card-raised py-3 font-sans text-sm font-bold text-ink ring-1 ring-line-strong"
            >
              Edit my order
            </button>
          )}
          <button
            onClick={onGoTable}
            className="tap flex-1 rounded-lg bg-ink py-3 font-sans text-sm font-bold text-card-raised"
          >
            See the table →
          </button>
        </div>
      </Screen>
    )
  }

  // default composing
  return (
    <Screen scrollKey="compose">
      <AppHeader right={youChip} />
      {TitleRow}
      {variant === 'submit-error' && <RetryBanner onRetry={onRetry} />}
      <div className="space-y-4 pb-2">
        {KIND_ORDER.map((kind) => {
          // unavailable items are hidden — the API rejects them anyway
          const items: MenuItem[] = restaurant.menu.filter((m) => m.kind === kind && m.available !== false)
          if (!items.length) return null
          return (
            <section key={kind}>
              <p className="mb-1.5 px-1 font-sans text-2xs font-bold uppercase tracking-[0.16em] text-ink-faint">
                {KIND_LABEL[kind]}
              </p>
              <ul className="space-y-1">
                {items.map((m) => (
                  <MenuItemRow key={m.id} item={m} draft={lineFor(m.id)} onChange={(d) => onDraftChange(m.id, d)} />
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <AddMenuItemForm onAdd={onAddMenuItem} />

      <AnimatePresence>
        {itemCount > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <RunningSubtotal
              subtotal={subtotal}
              itemCount={itemCount}
              ctaLabel="Add to the table →"
              onCta={onSubmit}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {itemCount === 0 && (
        <div className="mt-auto space-y-3 pb-6 pt-8 text-center">
          <p className="font-sans text-sm text-ink-faint">
            Tap <span className="font-semibold text-clay-deep">Add</span> on anything to start your order
          </p>
          {onRemoveOrder && (
            <button
              onClick={onRemoveOrder}
              className="tap w-full rounded-lg py-2.5 font-sans text-sm font-bold text-clay-deep ring-1 ring-clay/30 hover:bg-clay-wash"
            >
              Remove my order — frees my delivery share
            </button>
          )}
          <button onClick={onGoTable} className="tap w-full py-2 font-sans text-sm font-semibold text-ink-soft">
            Just looking? See the table →
          </button>
        </div>
      )}
    </Screen>
  )
}

function AddMenuItemForm({ onAdd }: { onAdd: (d: { name: string; price: number; kind: ItemKind }) => Promise<unknown> }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [kind, setKind] = useState<ItemKind>('plate')
  const submit = async () => {
    const n = name.trim()
    const p = parseFloat(price)
    if (!n || !(p >= 0) || busy) return
    setBusy(true)
    try {
      await onAdd({ name: n, price: egp(p), kind })
      // only reset on success — a failed add keeps the form (the toast explains)
      setName('')
      setPrice('')
      setKind('plate')
      setOpen(false)
    } catch {
      /* error surfaced by the global mutation toast */
    } finally {
      setBusy(false)
    }
  }
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-2 w-full rounded-lg border border-dashed border-line-strong py-2.5 font-sans text-sm font-semibold text-ink-soft transition-colors hover:border-clay hover:text-clay-deep"
      >
        ＋ Add an item to the menu
      </button>
    )
  }
  return (
    <div className="mb-2 rounded-lg bg-card-raised p-2.5 ring-1 ring-line">
      <div className="flex gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Item name"
          className="min-w-0 flex-1 rounded-md bg-paper px-2.5 py-2 font-sans text-sm font-semibold text-ink ring-1 ring-line-strong focus:ring-clay"
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          type="number"
          min={0}
          step={0.5}
          placeholder="EGP"
          aria-label="Price in EGP"
          className="tnum w-20 rounded-md bg-paper px-2 py-2 text-right font-sans text-sm font-bold text-ink ring-1 ring-line-strong focus:ring-clay"
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        {(['plate', 'drink', 'extra'] as ItemKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-full px-2.5 py-1 font-sans text-xs font-semibold capitalize ${
              kind === k ? 'bg-ink text-card-raised' : 'bg-card text-ink-soft ring-1 ring-line-strong'
            }`}
          >
            {k}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => setOpen(false)} className="px-2 py-1 font-sans text-xs font-semibold text-ink-faint">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className="tap rounded-md bg-clay px-3 py-1.5 font-sans text-xs font-bold text-card-raised disabled:opacity-50"
        >
          {busy ? 'Adding…' : 'Add'}
        </button>
      </div>
    </div>
  )
}
