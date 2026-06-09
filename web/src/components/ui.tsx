import { money } from '../lib/money'
import type { Piaster } from '../types'

// ── Avatar — warm initial chip, colour derived deterministically from name ───
const AVATAR_TONES = [
  'bg-clay/15 text-clay-deep',
  'bg-brass/20 text-[#8a5e16]',
  'bg-sage/20 text-sage-deep',
  'bg-[#7a6a52]/15 text-ink-soft',
  'bg-clay-deep/15 text-clay-deep',
]
const toneFor = (name: string) => {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_TONES[h % AVATAR_TONES.length]
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'lg' ? 'h-11 w-11 text-base' : size === 'sm' ? 'h-7 w-7 text-2xs' : 'h-9 w-9 text-xs'
  return (
    <span
      aria-hidden
      className={`inline-grid place-items-center rounded-full font-sans font-bold ring-1 ring-inset ring-ink/5 ${s} ${toneFor(name)}`}
    >
      {name.slice(0, 1)}
    </span>
  )
}

// ── Money ────────────────────────────────────────────────────────────────────
export function Money({
  p,
  unit = false,
  className = '',
}: {
  p: Piaster
  unit?: boolean
  className?: string
}) {
  return (
    <span className={`tnum ${className}`}>
      {unit && <span className="text-[0.7em] font-semibold text-ink-faint">EGP </span>}
      {money(p)}
    </span>
  )
}

// ── Section label — small caps, hand-set feel ────────────────────────────────
export function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`font-sans text-2xs font-bold uppercase tracking-[0.16em] text-ink-faint ${className}`}>
      {children}
    </p>
  )
}

const KIND_DOT: Record<string, string> = {
  plate: 'bg-clay',
  drink: 'bg-brass',
  extra: 'bg-sage',
}
export function KindDot({ kind }: { kind: string }) {
  return <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${KIND_DOT[kind] ?? 'bg-ink-faint'}`} />
}

// ── PAID rubber stamp ────────────────────────────────────────────────────────
export function Stamp({ children }: { children: React.ReactNode }) {
  return (
    <span className="-rotate-6 select-none rounded-[3px] border-2 border-sage/60 px-1.5 py-0.5 font-mono text-2xs font-bold uppercase tracking-widest text-sage-deep">
      {children}
    </span>
  )
}
