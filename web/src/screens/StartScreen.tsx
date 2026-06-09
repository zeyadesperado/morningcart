import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Restaurant } from '../types'
import { money } from '../lib/money'
import { AppHeader, Screen } from '../components/Shell'
import { Button } from '../components/Button'
import { Label } from '../components/ui'

export function StartScreen({
  restaurants,
  you,
  onStart,
}: {
  restaurants: Restaurant[]
  you: string
  onStart: (restaurantId: string) => void
}) {
  const [picked, setPicked] = useState(restaurants[0]?.id ?? '')

  return (
    <Screen scrollKey="start">
      <AppHeader />
      <div className="flex flex-1 flex-col justify-center pb-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Label>Good morning, {you}</Label>
          <h1 className="mt-2 font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-ink text-balance">
            No breakfast<br />going yet.
          </h1>
          <p className="mt-3 max-w-[30ch] font-sans text-base text-ink-soft text-pretty">
            Start one and drop the link in the group. Whoever’s free closes it when everyone’s in — it
            takes seconds, and nobody has to be “the breakfast person.”
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8"
        >
          <p className="mb-2 font-sans text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint">
            From where?
          </p>
          <div className="space-y-2">
            {restaurants.map((r) => (
              <button
                key={r.id}
                onClick={() => setPicked(r.id)}
                aria-pressed={picked === r.id}
                className={`tap flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                  picked === r.id
                    ? 'bg-card-raised shadow-card ring-2 ring-clay'
                    : 'bg-card-raised/60 ring-1 ring-line-strong hover:bg-card-raised'
                }`}
              >
                <span
                  className={`grid h-10 w-10 place-items-center rounded-full font-display text-lg font-semibold ${
                    picked === r.id ? 'bg-clay text-card-raised' : 'bg-wash text-ink-soft'
                  }`}
                  aria-hidden
                >
                  {r.name.slice(0, 1)}
                </span>
                <span className="flex-1">
                  <span className="block font-sans text-base font-bold text-ink">
                    {r.name} <span dir="rtl" className="text-sm font-medium text-ink-faint">{r.arabic}</span>
                  </span>
                  <span className="block font-sans text-xs text-ink-soft">delivery EGP {money(r.deliveryFee)}</span>
                </span>
                {picked === r.id && <span className="text-clay" aria-hidden>●</span>}
              </button>
            ))}
          </div>

          <div className="mt-6">
            <Button full onClick={() => onStart(picked)} className="!py-4 text-base">
              ☀ Start breakfast
            </Button>
          </div>
        </motion.div>
      </div>
    </Screen>
  )
}
