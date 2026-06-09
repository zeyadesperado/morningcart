import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'soft' | 'quiet'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-clay text-card-raised shadow-clay hover:bg-clay-deep active:bg-clay-deep ring-1 ring-clay-deep/40',
  soft: 'bg-clay-wash text-clay-deep ring-1 ring-clay/20 hover:bg-clay-soft/60',
  ghost:
    'bg-card-raised text-ink ring-1 ring-line-strong hover:bg-card hover:ring-ink/20',
  quiet: 'bg-transparent text-ink-soft hover:bg-wash hover:text-ink',
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  full = false,
  disabled = false,
  type = 'button',
  className = '',
  'aria-label': ariaLabel,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: Variant
  full?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
  'aria-label'?: string
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      className={`tap inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 font-sans text-sm font-bold tracking-tight transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45 ${
        VARIANTS[variant]
      } ${full ? 'w-full' : ''} ${className}`}
    >
      {children}
    </motion.button>
  )
}
