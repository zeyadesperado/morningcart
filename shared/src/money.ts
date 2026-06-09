import type { Piaster } from './types'

/** 12.50 EGP -> 1250 piasters */
export const egp = (pounds: number): Piaster => Math.round(pounds * 100)

/** 1250 -> "12.50" (always two decimals, tabular-friendly) */
export function money(p: Piaster): string {
  const sign = p < 0 ? '-' : ''
  const abs = Math.abs(p)
  const whole = Math.floor(abs / 100)
  const frac = (abs % 100).toString().padStart(2, '0')
  return `${sign}${whole}.${frac}`
}

/** "EGP 12.50" */
export const moneyEGP = (p: Piaster): string => `EGP ${money(p)}`
