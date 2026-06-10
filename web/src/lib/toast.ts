// Tiny pub/sub for surfacing background failures (mutations were previously
// fire-and-forget: a failed delete/patch just silently did nothing).
type Listener = (msg: string | null) => void

let listeners: Listener[] = []
let timer: ReturnType<typeof setTimeout> | undefined

export function notifyError(message: string) {
  for (const l of listeners) l(message)
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    for (const l of listeners) l(null)
  }, 4500)
}

export function subscribeToErrors(fn: Listener): () => void {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}
