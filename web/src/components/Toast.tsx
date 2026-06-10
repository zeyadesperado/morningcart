import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { subscribeToErrors } from '../lib/toast'

/** Bottom toast for mutation failures — mounted once at the app root. */
export function ErrorToast() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => subscribeToErrors(setMsg), [])
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-lg bg-ink px-4 py-3 font-sans text-sm font-semibold text-card-raised shadow-card"
        >
          ⚠ {msg}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
