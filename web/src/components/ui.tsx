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
// solid light fills for dark surfaces (the pastel washes go muddy on bg-ink)
const AVATAR_TONES_DARK = [
  'bg-clay-soft text-clay-deep',
  'bg-brass-soft text-[#6b4a10]',
  'bg-sage-soft text-sage-deep',
  'bg-paper-deep text-ink-soft',
  'bg-clay-soft text-clay-deep',
]
const hashFor = (name: string) => {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h
}

export function Avatar({
  name,
  size = 'md',
  onDark = false,
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
  onDark?: boolean
}) {
  const s = size === 'lg' ? 'h-11 w-11 text-base' : size === 'sm' ? 'h-7 w-7 text-2xs' : 'h-9 w-9 text-xs'
  const h = hashFor(name)
  const tone = (onDark ? AVATAR_TONES_DARK : AVATAR_TONES)[h % AVATAR_TONES.length]
  const tilt = (h % 7) - 3 // -3..3deg — fourteen friends, fourteen hand-stamped chips
  return (
    <span
      aria-hidden
      style={{ transform: `rotate(${tilt}deg)` }}
      className={`inline-grid place-items-center rounded-full font-sans font-bold ring-1 ring-inset ring-ink/5 ${s} ${tone}`}
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
  drink: 'bg-[#9A6A1E]', // darker brass — the default fails 3:1 at 6px
  extra: 'bg-sage',
}
export function KindDot({ kind }: { kind: string }) {
  return <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${KIND_DOT[kind] ?? 'bg-ink-faint'}`} />
}

// kind as a readable, tappable tag (Setup) — fixes the colour-only 6px dot
const KIND_TAG: Record<string, string> = {
  plate: 'bg-clay-wash text-clay-deep ring-clay/25',
  drink: 'bg-brass-wash text-[#6b4a10] ring-brass/30',
  extra: 'bg-sage-wash text-sage-deep ring-sage/30',
}
export function KindTag({ kind, onCycle }: { kind: string; onCycle?: () => void }) {
  const cls = KIND_TAG[kind] ?? 'bg-wash text-ink-soft ring-line-strong'
  if (!onCycle) {
    return (
      <span className={`rounded-full px-2 py-0.5 font-sans text-2xs font-bold capitalize ring-1 ring-inset ${cls}`}>
        {kind}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onCycle}
      title="Tap to change: plate → drink → extra"
      aria-label={`Kind: ${kind} — tap to change`}
      className={`tap rounded-full px-2.5 font-sans text-2xs font-bold capitalize ring-1 ring-inset transition-colors ${cls}`}
    >
      {kind}
    </button>
  )
}

// ── PAID rubber stamp ────────────────────────────────────────────────────────
export function Stamp({ children }: { children: React.ReactNode }) {
  return (
    <span className="-rotate-6 select-none rounded-[3px] border-2 border-sage/60 px-1.5 py-0.5 font-mono text-2xs font-bold uppercase tracking-widest text-sage-deep">
      {children}
    </span>
  )
}
