import { Button } from './Button'

export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg bg-card-raised/60 px-3 py-3 ring-1 ring-line">
          <div className="skeleton h-9 w-9 shrink-0 animate-shimmer rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-1/3 animate-shimmer rounded" />
            <div className="skeleton h-2.5 w-2/3 animate-shimmer rounded" />
          </div>
          <div className="skeleton h-7 w-14 animate-shimmer rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({
  icon = '☕',
  title,
  body,
  action,
}: {
  icon?: string
  title: string
  body: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-wash text-3xl ring-1 ring-line-strong" aria-hidden>
        {icon}
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold text-ink text-balance">{title}</h3>
      <p className="mt-1.5 max-w-[26ch] font-sans text-sm text-ink-soft text-pretty">{body}</p>
      {action && (
        <div className="mt-5">
          <Button onClick={action.onClick}>{action.label}</Button>
        </div>
      )}
    </div>
  )
}

export function ErrorState({ onRetry, what = 'load this' }: { onRetry: () => void; what?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center" role="alert">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-clay-wash text-3xl ring-1 ring-clay/30" aria-hidden>
        ⚠
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold text-ink">Couldn’t {what}</h3>
      <p className="mt-1.5 max-w-[28ch] font-sans text-sm text-ink-soft text-pretty">
        The office Wi-Fi blinked. Your work isn’t lost — try again.
      </p>
      <div className="mt-5">
        <Button variant="ghost" onClick={onRetry}>
          ↻ Retry
        </Button>
      </div>
    </div>
  )
}

// non-blocking "couldn't submit" — draft preserved, never a false success
export function RetryBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="mb-3 flex items-center gap-3 rounded-lg bg-clay-wash px-3 py-2.5 ring-1 ring-clay/30"
    >
      <span aria-hidden className="text-lg">⚠</span>
      <p className="flex-1 font-sans text-sm font-medium text-clay-deep">
        Not submitted — your order is saved as a draft.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="tap rounded-md bg-clay px-3 py-1.5 font-sans text-xs font-bold text-card-raised"
      >
        Retry
      </button>
    </div>
  )
}
