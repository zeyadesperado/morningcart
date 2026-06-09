import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Avatar } from './ui'

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
  const item = (label: string, fn: () => void) => (
    <button
      onClick={() => {
        fn()
        setOpen(false)
      }}
      className="block w-full rounded-lg px-3 py-2 text-left font-sans text-sm font-semibold text-ink transition-colors hover:bg-wash"
    >
      {label}
    </button>
  )

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={open}
        className="fixed bottom-4 left-4 z-[70] inline-flex items-center gap-2 rounded-full bg-ink px-2.5 py-2 text-card-raised shadow-lift ring-1 ring-ink/40"
      >
        <Avatar name={you} size="sm" />
        <span className="pr-1 font-sans text-xs font-bold">{you}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[70] bg-ink/20"
            />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 480, damping: 32 }}
              className="fixed bottom-16 left-4 z-[71] w-44 overflow-hidden rounded-xl bg-card-raised p-1.5 shadow-lift ring-1 ring-line-strong"
            >
              {item('☕  Today', onHome)}
              {item('⚙  Setup', onSetup)}
              <div className="my-1 border-t border-line" />
              {item('⎋  Sign out', onLogout)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
