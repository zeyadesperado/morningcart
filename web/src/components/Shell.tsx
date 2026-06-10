import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export function GrainFilm() {
  return <div className="grain-film" aria-hidden />
}

// little sunrise-over-the-counter mark; animated = rays draw in, sun rises
export function Mark({ className = 'h-7 w-7', animated = false }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      {[...Array(8)].map((_, i) => (
        <motion.line
          key={i}
          x1="16"
          y1="16"
          x2="16"
          y2="3"
          className="stroke-brass"
          strokeWidth="2.2"
          strokeLinecap="round"
          transform={`rotate(${i * 45} 16 16)`}
          opacity={0.85}
          initial={animated ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.35 + i * 0.06, duration: 0.4, ease: 'easeOut' }}
        />
      ))}
      <motion.circle
        cx="16"
        cy="16"
        r="7.5"
        className="fill-clay"
        initial={animated ? { cy: 21, opacity: 0 } : false}
        animate={{ cy: 16, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.1 }}
      />
    </svg>
  )
}

export function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <Mark />
      <div className="leading-none">
        <p className="font-display text-lg font-semibold tracking-tight text-ink">MorningCart</p>
        <p className="font-sans text-2xs font-medium text-ink-faint" dir="rtl" lang="ar">
          صباح الفول · breakfast, sorted
        </p>
      </div>
    </div>
  )
}

export function AppHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 pb-3 pt-1">
      <Wordmark />
      {right}
    </header>
  )
}

// The mobile-first column the whole product lives in.
// pb-thumb keeps lists clear of the floating nav chip; safe-area padding for
// standalone/PWA mode (Dynamic Island top, home indicator bottom).
export function Screen({ children, scrollKey }: { children: ReactNode; scrollKey?: string }) {
  useEffect(() => {
    window.scrollTo(0, 0) // never land mid-roster when switching views
  }, [])
  return (
    <motion.main
      key={scrollKey}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto flex min-h-[100dvh] w-full max-w-phone flex-col px-4 pb-thumb pt-[env(safe-area-inset-top)]"
    >
      {children}
    </motion.main>
  )
}

/**
 * Thumb-zone dock: pins its content to the viewport bottom while the screen
 * scrolls (true sticky — the parent column is full-height, so it actually
 * pins, unlike a sticky wrapped in its own-height container). Left padding
 * clears the floating nav chip.
 */
export function ThumbDock({ children, show = true }: { children: ReactNode; show?: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 14 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none sticky bottom-0 z-30 -mx-4 mt-auto px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pl-[4.5rem] pt-3"
        >
          <div className="absolute inset-x-0 bottom-0 h-[130%] bg-gradient-to-t from-paper via-paper/95 to-transparent" aria-hidden />
          <div className="pointer-events-auto relative">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function SectionCard({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl bg-card-raised p-4 shadow-card ring-1 ring-line ${className}`}>{children}</div>
  )
}
