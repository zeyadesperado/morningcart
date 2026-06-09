import type { CloseResult, Restaurant } from '../types'
import { money } from './money'

const KIND_LABEL: Record<string, string> = { plate: 'PLATES', drink: 'DRINKS', extra: 'EXTRAS' }

/**
 * The single artifact that goes to the vendor — equally good pasted into
 * WhatsApp or read aloud over the phone. Plain text, grouped, notes inline.
 */
export function aggregateToText(result: CloseResult, restaurant: Restaurant): string {
  const kindOf = (itemId: string) => restaurant.menu.find((m) => m.id === itemId)?.kind ?? 'plate'
  const order: Array<'plate' | 'drink' | 'extra'> = ['plate', 'drink', 'extra']

  const lines: string[] = []
  lines.push(`${restaurant.name} — breakfast order (${result.headcount} people)`)
  lines.push('')

  for (const kind of order) {
    const group = result.aggregate.filter((a) => kindOf(a.itemId) === kind)
    if (group.length === 0) continue
    lines.push(KIND_LABEL[kind])
    for (const a of group) {
      const notes = a.notes.length ? `  (${a.notes.map((n) => `${n.count} ${n.note}`).join(', ')})` : ''
      lines.push(`${a.qty} × ${a.name}${notes}`)
    }
    lines.push('')
  }

  lines.push(
    `Total: EGP ${money(result.grandTotal)}  (incl. EGP ${money(result.deliveryFee)} delivery)`,
  )
  return lines.join('\n')
}
