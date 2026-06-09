import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export function GrainFilm() {
  return <div className="grain-film" aria-hidden />
}

// little sunrise-over-the-counter mark
export function Mark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      <circle cx="16" cy="16" r="7.5" className="fill-clay" />
      {[...Array(8)].map((_, i) => (
        <line
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
        />
      ))}
      <circle cx="16" cy="16" r="7.5" className="fill-clay" />
    </svg>
  )
}

export function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <Mark />
      <div className="leading-none">
        <p className="font-display text-lg font-semibold tracking-tight text-ink">MorningCart</p>
        <p className="font-sans text-2xs font-medium text-ink-faint" dir="rtl">
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
export function Screen({ children, scrollKey }: { children: ReactNode; scrollKey?: string }) {
  return (
    <motion.main
      key={scrollKey}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto flex min-h-[100dvh] w-full max-w-phone flex-col px-4"
    >
      {children}
    </motion.main>
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
