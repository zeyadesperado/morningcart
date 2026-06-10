import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Avatar } from './ui'

// Anchored to the phone column (not the viewport edge) and avatar-only, so it
// stops drifting in landscape and never covers dock content — docks reserve
// its lane via ThumbDock's left padding.
const CHIP_LEFT = 'left-[max(0.75rem,calc(50%-14.5rem))]'
const CHIP_BOTTOM = 'bottom-[max(0.85rem,env(safe-area-inset-bottom))]'

export function AppNav({
  you,
  onHome,
  onSetup,
  onLogout,
}: {
  you: string
  onHome: () => void
  onSetup: () => void
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    firstItemRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const item = (label: string, fn: () => void, ref?: React.Ref<HTMLButtonElement>) => (
    <button
      ref={ref}
      onClick={() => {
        fn()
        setOpen(false)
      }}
      className="block w-full rounded-lg px-3 py-3 text-left font-sans text-sm font-semibold text-ink transition-colors hover:bg-wash"
    >
      {label}
    </button>
  )

  return (
    <>
      <button
        ref={toggleRef}
        onClick={() => setOpen((o) => !o)}
        aria-label={`Menu — signed in as ${you}`}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`tap fixed z-[55] grid place-items-center rounded-full bg-ink p-0.5 shadow-lift ring-1 ring-ink/40 ${CHIP_LEFT} ${CHIP_BOTTOM}`}
      >
        <Avatar name={you} size="lg" onDark />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setOpen(false)
                toggleRef.current?.focus()
              }}
              className="fixed inset-0 z-[70] bg-ink/20"
            />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 480, damping: 32 }}
              className={`fixed z-[71] w-48 overflow-hidden rounded-xl bg-card-raised p-1.5 shadow-lift ring-1 ring-line-strong ${CHIP_LEFT} bottom-[calc(max(0.85rem,env(safe-area-inset-bottom))+3.6rem)]`}
            >
              <div className="flex items-center gap-2 border-b border-line px-3 pb-2 pt-1.5">
                <Avatar name={you} size="sm" />
                <span className="truncate font-sans text-sm font-bold text-ink">{you}</span>
              </div>
              <div className="pt-1">
                {item('☕  Today', onHome, firstItemRef)}
                {item('⚙  Setup', onSetup)}
                <div className="my-1 border-t border-line" />
                {item('⎋  Sign out', onLogout)}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
