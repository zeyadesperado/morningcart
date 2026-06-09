import { motion } from 'framer-motion'

export function QtyStepper({
  value,
  onChange,
  label,
  min = 0,
  max = 20,
}: {
  value: number
  onChange: (n: number) => void
  label: string
  min?: number
  max?: number
}) {
  const Btn = ({ delta, sign }: { delta: number; sign: string }) => (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      onClick={() => onChange(Math.min(max, Math.max(min, value + delta)))}
      disabled={delta < 0 ? value <= min : value >= max}
      aria-label={`${delta < 0 ? 'Remove one' : 'Add one'} ${label}`}
      className="tap grid h-11 w-11 place-items-center rounded-full bg-card text-xl font-bold text-ink ring-1 ring-line-strong transition-colors hover:bg-clay-wash hover:text-clay-deep disabled:opacity-30"
    >
      {sign}
    </motion.button>
  )
  return (
    <div className="inline-flex items-center gap-1.5" role="group" aria-label={`Quantity for ${label}`}>
      <Btn delta={-1} sign="–" />
      <span className="tnum w-7 text-center text-lg font-bold text-ink" aria-live="polite">
        {value}
      </span>
      <Btn delta={1} sign="+" />
    </div>
  )
}
