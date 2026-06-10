import { useEffect, useState } from 'react'
import type { ItemKind, MenuItem, Restaurant } from '../types'
import { egp } from '../lib/money'
import type { LineDraft } from '../components/MenuItemRow'
import { MenuItemRow } from '../components/MenuItemRow'
import { RunningSubtotal } from '../components/RunningSubtotal'
import { AppHeader, Screen, ThumbDock } from '../components/Shell'
import { StatusBadge } from '../components/StatusBadge'
import { SkeletonList, EmptyState, ErrorState, RetryBanner } from '../components/States'
import { Avatar, Label } from '../components/ui'

export type ComposeVariant = 'default' | 'loading' | 'empty' | 'error' | 'submit-error' | 'just-closed'

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
  const headerRight = (
    <div className="flex items-center gap-2">
      <StatusBadge status="open" />
      {youChip}
    </div>
  )

  const TitleRow = (
    <div className="pb-3">
      <Label>This morning</Label>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink text-balance">
        What are you having?
      </h1>
      <p className="mt-1 font-sans text-sm text-ink-soft">
        from <span className="font-semibold text-ink">{restaurant.name}</span>{' '}
        <span dir="rtl" lang="ar" className="text-ink-faint">
          {restaurant.arabic}
        </span>
      </p>
    </div>
  )

  if (variant === 'loading') {
    return (
      <Screen scrollKey="compose-loading">
        <AppHeader right={youChip} />
        {TitleRow}
        <Label className="pb-2">Reading the menu…</Label>
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

  // someone closed the order mid-draft — retry can never succeed, be honest
  if (variant === 'just-closed') {
    return (
      <Screen scrollKey="compose-just-closed">
        <AppHeader right={youChip} />
        <EmptyState
          icon="☕"
          title="Ordering just closed"
          body="Someone closed the order while you were picking. Your picks are saved as a draft for next time."
          action={{ label: 'See the table →', onClick: onGoTable }}
        />
      </Screen>
    )
  }

  // default composing
  return (
    <Screen scrollKey="compose">
      <AppHeader right={headerRight} />
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

      {itemCount === 0 && (
        <div className="mt-auto space-y-3 pb-2 pt-8 text-center">
          <p className="font-sans text-sm text-ink-faint">
            Tap <span className="font-semibold text-clay-deep">Add</span> on anything to start your order
          </p>
          {onRemoveOrder && <RemoveOrderButton onRemove={onRemoveOrder} />}
          <button onClick={onGoTable} className="tap w-full py-2 font-sans text-sm font-semibold text-ink-soft">
            Just looking? See the table →
          </button>
        </div>
      )}

      <ThumbDock show={itemCount > 0}>
        <RunningSubtotal subtotal={subtotal} itemCount={itemCount} ctaLabel="Add to the table →" onCta={onSubmit} />
      </ThumbDock>
    </Screen>
  )
}

// removing an order frees a delivery share for everyone else — one step back
function RemoveOrderButton({ onRemove }: { onRemove: () => void }) {
  const [arm, setArm] = useState(false)
  useEffect(() => {
    if (!arm) return
    const t = setTimeout(() => setArm(false), 3500)
    return () => clearTimeout(t)
  }, [arm])
  return (
    <button
      onClick={() => (arm ? onRemove() : setArm(true))}
      className="tap w-full rounded-lg py-2.5 font-sans text-sm font-bold text-clay-deep ring-1 ring-clay/30 hover:bg-clay-wash"
    >
      {arm ? 'Really remove? Tap again ✓' : 'Remove my order — frees my delivery share'}
    </button>
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
        className="tap mb-2 w-full rounded-lg border border-dashed border-line-strong py-3 font-sans text-sm font-semibold text-ink-soft transition-colors hover:border-clay hover:text-clay-deep"
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
          onFocus={(e) => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' })}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Item name"
          aria-label="New item name"
          className="min-w-0 flex-1 rounded-md bg-paper px-2.5 py-2 font-sans text-sm font-semibold text-ink ring-1 ring-line-bold placeholder:text-ink-faint focus:ring-clay"
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          placeholder="EGP"
          aria-label="Price in EGP"
          className="tnum w-20 rounded-md bg-paper px-2 py-2 text-right font-sans text-sm font-bold text-ink ring-1 ring-line-bold placeholder:text-ink-faint focus:ring-clay"
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        {(['plate', 'drink', 'extra'] as ItemKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={`tap rounded-full px-3 font-sans text-xs font-semibold capitalize ${
              kind === k ? 'bg-ink text-card-raised' : 'bg-card text-ink-soft ring-1 ring-line-strong'
            }`}
          >
            {k}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setOpen(false)}
          className="tap px-3 font-sans text-xs font-semibold text-ink-faint"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className="tap rounded-md bg-clay-deep px-3.5 font-sans text-xs font-bold text-card-raised disabled:opacity-50"
        >
          {busy ? 'Adding…' : 'Add'}
        </button>
      </div>
    </div>
  )
}
