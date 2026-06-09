import type { SessionStatus } from '../types'

// Status by SHAPE + ICON + TEXT — never colour alone (a11y).
export function StatusBadge({ status }: { status: SessionStatus | 'placed' }) {
  const map = {
    open: { dot: '◗', label: 'Open · ordering', cls: 'text-sage-deep bg-sage-wash ring-sage/30' },
    closed: { dot: '■', label: 'Closed', cls: 'text-ink-soft bg-wash ring-line-strong' },
    placed: { dot: '✓', label: 'Placed', cls: 'text-clay-deep bg-clay-wash ring-clay/25' },
  } as const
  const s = map[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-sans text-2xs font-bold uppercase tracking-[0.1em] ring-1 ring-inset ${s.cls}`}
    >
      <span aria-hidden className={status === 'open' ? 'animate-pulse' : ''}>
        {s.dot}
      </span>
      {s.label}
    </span>
  )
}
