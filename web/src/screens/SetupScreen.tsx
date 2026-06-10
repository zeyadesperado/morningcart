import type { ItemKind } from '@morningcart/shared'
import type { MenuItemDTO, RestaurantDTO } from '../api/client'
import { egp, money } from '../lib/money'
import { AppHeader, Screen } from '../components/Shell'
import { Button } from '../components/Button'
import { EmptyState, SkeletonList } from '../components/States'
import { KindDot, Label } from '../components/ui'

/** Parse an EGP input; null = leave the stored value alone (blank/invalid). */
function parseEgp(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  const n = parseFloat(t)
  if (!isFinite(n) || n < 0) return null
  return egp(n)
}

export function SetupScreen({
  restaurants,
  activeId,
  loading,
  onSelect,
  onAddRestaurant,
  onPatchRestaurant,
  onAddItem,
  onPatchItem,
  onRemoveItem,
  onDeleteRestaurant,
}: {
  restaurants: RestaurantDTO[]
  activeId: string
  loading: boolean
  onSelect: (id: string) => void
  onAddRestaurant: () => void
  onPatchRestaurant: (id: string, data: { name?: string; deliveryFee?: number; arabic?: string }) => void
  onAddItem: (id: string) => void
  onPatchItem: (
    id: string,
    itemId: string,
    data: Partial<{ name: string; price: number; kind: ItemKind; available: boolean; arabic: string }>,
  ) => void
  onRemoveItem: (id: string, itemId: string) => void
  onDeleteRestaurant: (id: string) => void
}) {
  if (loading) {
    return (
      <Screen scrollKey="setup-loading">
        <AppHeader />
        <div className="py-3">
          <Label>Setup</Label>
        </div>
        <SkeletonList rows={6} />
      </Screen>
    )
  }

  if (restaurants.length === 0) {
    return (
      <Screen scrollKey="setup-empty">
        <AppHeader />
        <EmptyState
          icon="🧾"
          title="No restaurants yet"
          body="Add a place once — its name, delivery fee, and items — and the team can order from it every morning."
          action={{ label: 'Add a restaurant', onClick: onAddRestaurant }}
        />
      </Screen>
    )
  }

  const r = restaurants.find((x) => x.id === activeId) ?? restaurants[0]

  return (
    <Screen scrollKey="setup">
      <AppHeader />
      <div className="pb-3 pt-1">
        <Label>Setup · edited rarely</Label>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">Restaurants</h1>
        <p className="mt-1 font-sans text-sm text-ink-soft">Name, delivery fee, and the item list. That’s the whole admin.</p>
      </div>

      <div className="mb-4 flex gap-2">
        {restaurants.map((x) => (
          <button
            key={x.id}
            onClick={() => onSelect(x.id)}
            className={`tap flex-1 rounded-lg px-3 py-2 text-left font-sans transition-colors ${
              x.id === r.id ? 'bg-ink text-card-raised' : 'bg-card-raised text-ink ring-1 ring-line-strong'
            }`}
          >
            <span className="block text-sm font-bold">{x.name}</span>
            <span className={`block text-2xs ${x.id === r.id ? 'text-paper/70' : 'text-ink-faint'}`}>
              delivery {money(x.deliveryFee)}
            </span>
          </button>
        ))}
        <button
          onClick={onAddRestaurant}
          aria-label="Add restaurant"
          className="tap grid w-12 place-items-center rounded-lg bg-card-raised text-xl font-bold text-clay-deep ring-1 ring-line-strong"
        >
          +
        </button>
      </div>

      <div className="space-y-4">
        <Field label="Name">
          <input
            key={`${r.id}-name`}
            defaultValue={r.name}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v && v !== r.name) onPatchRestaurant(r.id, { name: v })
              else e.target.value = r.name
            }}
            className="w-full rounded-lg bg-card-raised px-3 py-2.5 font-sans text-base font-semibold text-ink ring-1 ring-line-strong focus:ring-clay"
          />
        </Field>

        <Field label="Arabic name · shows on the vendor ticket (optional)">
          <input
            key={`${r.id}-arabic`}
            dir="rtl"
            defaultValue={r.arabic ?? ''}
            placeholder="الاسم بالعربي"
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v !== (r.arabic ?? '')) onPatchRestaurant(r.id, { arabic: v })
            }}
            className="w-full rounded-lg bg-card-raised px-3 py-2.5 font-sans text-base font-semibold text-ink ring-1 ring-line-strong placeholder:text-ink-faint focus:ring-clay"
          />
        </Field>

        <Field label="Delivery fee (EGP) · split across everyone who ordered">
          <div className="inline-flex items-center gap-2 rounded-lg bg-card-raised px-3 py-2 ring-1 ring-line-strong focus-within:ring-clay">
            <span className="font-sans text-sm font-semibold text-ink-soft">EGP</span>
            <input
              key={`${r.id}-fee`}
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              defaultValue={(r.deliveryFee / 100).toString()}
              onBlur={(e) => {
                const v = parseEgp(e.target.value)
                if (v === null) {
                  e.target.value = (r.deliveryFee / 100).toString() // blank/invalid ≠ "make it free"
                  return
                }
                if (v !== r.deliveryFee) onPatchRestaurant(r.id, { deliveryFee: v })
              }}
              className="tnum w-24 bg-transparent font-sans text-base font-bold text-ink focus:outline-none"
            />
          </div>
        </Field>

        <div>
          <Label>Items · {r.menu.length}</Label>
          <ul className="mt-1.5 overflow-hidden rounded-lg ring-1 ring-line">
            {r.menu.map((m: MenuItemDTO, i: number) => (
              <li
                key={m.id}
                className={`flex items-center gap-2 bg-card-raised/70 px-2.5 py-2 ${i ? 'border-t border-line/70' : ''}`}
              >
                <KindDot kind={m.kind} />
                <input
                  defaultValue={m.name}
                  placeholder="item name"
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v && v !== m.name) onPatchItem(r.id, m.id, { name: v })
                    else e.target.value = m.name
                  }}
                  className={`min-w-0 flex-1 rounded bg-transparent font-sans text-sm font-semibold text-ink placeholder:text-ink-faint focus:outline-none focus-visible:ring-1 ${
                    m.available ? '' : 'line-through opacity-60'
                  }`}
                />
                <input
                  dir="rtl"
                  defaultValue={m.arabic ?? ''}
                  placeholder="عربي"
                  aria-label={`Arabic name for ${m.name || 'item'}`}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v !== (m.arabic ?? '')) onPatchItem(r.id, m.id, { arabic: v })
                  }}
                  className="w-16 rounded bg-transparent text-right font-sans text-sm text-ink-soft placeholder:text-ink-faint focus:outline-none focus-visible:ring-1"
                />
                <div className="inline-flex items-center gap-1 rounded-md bg-paper px-2 py-1 ring-1 ring-line">
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    defaultValue={(m.price / 100).toString()}
                    onBlur={(e) => {
                      const v = parseEgp(e.target.value)
                      if (v === null) {
                        e.target.value = (m.price / 100).toString()
                        return
                      }
                      if (v !== m.price) onPatchItem(r.id, m.id, { price: v })
                    }}
                    aria-label={`Price for ${m.name || 'item'}`}
                    className="tnum w-14 bg-transparent text-right font-sans text-sm font-bold text-ink focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => onPatchItem(r.id, m.id, { available: !m.available })}
                  aria-label={m.available ? `Mark ${m.name || 'item'} unavailable` : `Mark ${m.name || 'item'} available`}
                  title={m.available ? 'Available — tap to hide from ordering' : 'Unavailable — tap to bring back'}
                  className={`tap grid h-9 w-9 shrink-0 place-items-center rounded-md text-base ${
                    m.available ? 'text-sage-deep hover:bg-wash' : 'text-ink-faint hover:bg-wash'
                  }`}
                >
                  {m.available ? '◉' : '○'}
                </button>
                <button
                  onClick={() => onRemoveItem(r.id, m.id)}
                  aria-label={`Remove ${m.name || 'item'}`}
                  className="tap grid h-9 w-9 shrink-0 place-items-center rounded-md text-ink-faint hover:bg-clay-wash hover:text-clay-deep"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2">
            <Button variant="soft" onClick={() => onAddItem(r.id)}>
              ＋ Add item
            </Button>
          </div>
          <p className="mt-2 px-1 font-sans text-xs text-ink-faint">
            ◉ = orderable this morning. Items that were ever ordered can’t be removed — mark them ○ unavailable instead.
          </p>
        </div>
      </div>
      <button
        onClick={() => onDeleteRestaurant(r.id)}
        className="mt-6 w-full rounded-lg py-2.5 font-sans text-sm font-bold text-clay-deep ring-1 ring-clay/30 transition-colors hover:bg-clay-wash"
      >
        Delete “{r.name}”
      </button>
      <div className="h-10" />
    </Screen>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-sans text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint">{label}</span>
      {children}
    </label>
  )
}
