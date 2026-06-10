import type { CloseResult, Restaurant } from '../types'
import { money } from './money'

// bilingual section heads — the foul-cart guy reads the Arabic, the group
// chat reads the English; Western digits stay so quantities are unambiguous
const KIND_LABEL: Record<string, string> = {
  plate: 'PLATES · أطباق',
  drink: 'DRINKS · مشروبات',
  extra: 'EXTRAS · إضافات',
}

/**
 * The single artifact that goes to the vendor — equally good pasted into
 * WhatsApp or read aloud over the phone. Arabic-first item names (that's who
 * is reading it), English fallback, totals in both registers.
 */
export function aggregateToText(result: CloseResult, restaurant: Restaurant): string {
  const kindOf = (itemId: string) => restaurant.menu.find((m) => m.id === itemId)?.kind ?? 'plate'
  const order: Array<'plate' | 'drink' | 'extra'> = ['plate', 'drink', 'extra']

  const lines: string[] = []
  const arName = restaurant.arabic ? ` ${restaurant.arabic}` : ''
  lines.push(`${restaurant.name}${arName} — طلب فطار (${result.headcount} نفر)`)
  lines.push('')

  for (const kind of order) {
    const group = result.aggregate.filter((a) => kindOf(a.itemId) === kind)
    if (group.length === 0) continue
    lines.push(KIND_LABEL[kind])
    for (const a of group) {
      const name = a.arabic ? `${a.arabic} (${a.name})` : a.name
      const notes = a.notes.length ? `  — ${a.notes.map((n) => `${n.count} ${n.note}`).join(', ')}` : ''
      lines.push(`${a.qty} × ${name}${notes}`)
    }
    lines.push('')
  }

  lines.push(`الإجمالي: ${money(result.grandTotal)} جنيه (منهم ${money(result.deliveryFee)} توصيل)`)
  lines.push(`Total: EGP ${money(result.grandTotal)} (incl. EGP ${money(result.deliveryFee)} delivery)`)
  return lines.join('\n')
}
