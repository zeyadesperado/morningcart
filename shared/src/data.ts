import type { MenuItem, Order, OrderLine, Restaurant, Session } from './types'
import { egp } from './money'

export const YOU = 'Mariam'

// ── Menus ────────────────────────────────────────────────────────────────────
const elSobhyMenu: MenuItem[] = [
  { id: 'foul', name: 'Foul', arabic: 'فول', kind: 'plate', price: egp(8) },
  { id: 'taameya', name: "Ta'ameya", arabic: 'طعمية', kind: 'plate', price: egp(6) },
  { id: 'fries', name: 'Fries sandwich', arabic: 'ساندويتش بطاطس', kind: 'plate', price: egp(7) },
  { id: 'cheese', name: 'Cheese sandwich', arabic: 'ساندويتش جبنة', kind: 'plate', price: egp(9) },
  { id: 'eggs', name: 'Fried eggs', arabic: 'بيض', kind: 'plate', price: egp(12) },
  { id: 'basterma', name: 'Basterma & eggs', arabic: 'بسطرمة بيض', kind: 'plate', price: egp(18) },
  { id: 'bread', name: 'Baladi bread', arabic: 'عيش بلدي', kind: 'extra', price: egp(2) },
  { id: 'pickles', name: 'Pickles', arabic: 'مخلل', kind: 'extra', price: egp(2) },
  { id: 'tahina', name: 'Tahina', arabic: 'طحينة', kind: 'extra', price: egp(3) },
  { id: 'tea', name: 'Tea', arabic: 'شاي', kind: 'drink', price: egp(3) },
  { id: 'mint', name: 'Mint tea', arabic: 'شاي بالنعناع', kind: 'drink', price: egp(4) },
  { id: 'coffee', name: 'Turkish coffee', arabic: 'قهوة تركي', kind: 'drink', price: egp(6) },
  { id: 'nescafe', name: 'Nescafé', arabic: 'نسكافيه', kind: 'drink', price: egp(9) },
]

const abouHassanMenu: MenuItem[] = [
  { id: 'foul', name: 'Foul Eskandarani', arabic: 'فول إسكندراني', kind: 'plate', price: egp(10) },
  { id: 'taameya', name: "Ta'ameya", arabic: 'طعمية', kind: 'plate', price: egp(7) },
  { id: 'liver', name: 'Alexandrian liver', arabic: 'كبدة', kind: 'plate', price: egp(20) },
  { id: 'sausage', name: 'Sausage sandwich', arabic: 'سجق', kind: 'plate', price: egp(15) },
  { id: 'cheese', name: 'Cheese sandwich', arabic: 'ساندويتش جبنة', kind: 'plate', price: egp(10) },
  { id: 'bread', name: 'Baladi bread', arabic: 'عيش بلدي', kind: 'extra', price: egp(2) },
  { id: 'tea', name: 'Tea', arabic: 'شاي', kind: 'drink', price: egp(3) },
  { id: 'coffee', name: 'Turkish coffee', arabic: 'قهوة تركي', kind: 'drink', price: egp(7) },
]

export const RESTAURANTS: Restaurant[] = [
  { id: 'el-sobhy', name: 'El Sobhy', arabic: 'الصبحي', deliveryFee: egp(30), menu: elSobhyMenu },
  { id: 'abou-hassan', name: 'Abou Hassan', arabic: 'أبو حسن', deliveryFee: egp(25), menu: abouHassanMenu },
]

export const restaurantById = (id: string): Restaurant =>
  RESTAURANTS.find((r) => r.id === id) ?? RESTAURANTS[0]

export const COLLEAGUES = [
  'Mariam', 'Tarek', 'Karim', 'Salma', 'Ahmed', 'Mohamed', 'Nour', 'Hana',
  'Omar', 'Youssef', 'Laila', 'Mostafa', 'Dina', 'Khaled', 'Aya',
]

// ── Helpers ──────────────────────────────────────────────────────────────────
const ln = (itemId: string, qty: number, note?: string, forName?: string): OrderLine => ({
  itemId,
  qty,
  ...(note ? { note } : {}),
  ...(forName ? { forName } : {}),
})

let oid = 0
const order = (person: string, lines: OrderLine[], paid = false): Order => ({
  id: `o${++oid}`,
  person,
  lines,
  paid,
  joinedAt: oid,
})

// ── Open session (this morning, mid-flow, El Sobhy) ─────────────────────────
export const OPEN_SESSION: Session = {
  id: 's-today',
  restaurantId: 'el-sobhy',
  startedBy: 'Omar',
  status: 'open',
  dateLabel: 'Today · Tue',
  orders: [
    order('Tarek', [ln('foul', 1, 'no oil'), ln('tea', 1), ln('cheese', 1, undefined, 'Ziad')]),
    order('Karim', [ln('taameya', 1), ln('foul', 1), ln('coffee', 1)]),
    order('Salma', [ln('cheese', 1), ln('nescafe', 1, 'extra hot')]),
    order('Ahmed', [ln('foul', 2, 'no oil'), ln('tea', 1)]),
    order('Mohamed', [ln('eggs', 1), ln('bread', 2), ln('tea', 1)]),
    order('Nour', [ln('taameya', 1), ln('mint', 1)]),
    order('Hana', [ln('fries', 1, 'no pickles'), ln('tea', 1)]),
    order('Omar', [ln('basterma', 1), ln('coffee', 1)]),
    order('Youssef', [ln('taameya', 2), ln('foul', 1), ln('tea', 1)]),
    order('Laila', [ln('cheese', 1), ln('mint', 1)]),
    order('Mostafa', [ln('foul', 1), ln('tahina', 1), ln('tea', 1)]),
    order('Dina', [ln('fries', 1), ln('nescafe', 1)]),
    order('Khaled', [ln('foul', 1), ln('taameya', 1), ln('coffee', 1), ln('pickles', 1)]),
  ],
}

// ── Closed session (yesterday, El Sobhy) ────────────────────────────────────
// 11 submitters, fee 3000 / 11 -> remainder 8: eight pay 273, three pay 272.
export const CLOSED_SESSION: Session = {
  id: 's-yesterday',
  restaurantId: 'el-sobhy',
  startedBy: 'Dina',
  status: 'closed',
  dateLabel: 'Yesterday · Mon',
  orders: [
    order('Mariam', [ln('foul', 1, 'no oil'), ln('tea', 1)], true),
    order('Tarek', [ln('cheese', 1), ln('coffee', 1)], true),
    order('Karim', [ln('taameya', 2), ln('foul', 1), ln('tea', 1)], false),
    order('Salma', [ln('eggs', 1), ln('bread', 1), ln('nescafe', 1)], true),
    order('Ahmed', [ln('foul', 2), ln('tea', 1, 'no sugar')], false),
    order('Nour', [ln('fries', 1), ln('mint', 1)], true),
    order('Omar', [ln('basterma', 1), ln('coffee', 1, undefined, 'Ziad')], true),
    order('Hana', [ln('cheese', 1), ln('tea', 1)], false),
    order('Youssef', [ln('foul', 1), ln('taameya', 1), ln('coffee', 1)], true),
    order('Mostafa', [ln('eggs', 1), ln('tea', 1)], true),
    order('Laila', [ln('taameya', 1), ln('mint', 1)], false),
  ],
}
