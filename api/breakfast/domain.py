"""Pure money + aggregation logic — the server's authority, with no Django deps so
it can be property-tested in isolation. Money is integer piasters everywhere.

This is the Python twin of web/shared's aggregate.ts; both are property-tested to
the same invariant: Σ(per-person totals) == itemsGrandTotal + deliveryFee.
"""
from __future__ import annotations


def egp(pounds: float) -> int:
    return round(pounds * 100)


def money(p: int) -> str:
    sign = '-' if p < 0 else ''
    a = abs(p)
    return f'{sign}{a // 100}.{a % 100:02d}'


def delivery_split(fee: int, n: int) -> list[int]:
    """Split a fixed fee across n submitters so shares sum to `fee` EXACTLY.
    Floor each share, then hand the remainder out one piaster at a time."""
    if n <= 0:
        return []
    base = fee // n
    remainder = fee - base * n  # 0..n-1
    return [base + 1 if i < remainder else base for i in range(n)]


def compute_result(orders: list[dict], menu: list[dict], delivery_fee: int) -> dict:
    """orders: [{person, paid, lines:[{item_id, qty, unit_price, note, for_name}]}]
    menu:   [{id, name, arabic, kind, sort_order}] (already in display order)
    Returns a CloseResult dict with camelCase keys matching the API contract."""
    position = {m['id']: i for i, m in enumerate(menu)}
    by_id = {m['id']: m for m in menu}

    # vendor rollup: qty per item + notes with counts
    agg: dict[str, dict] = {}
    for o in orders:
        for l in o['lines']:
            item = by_id.get(l['item_id'])
            if not item:
                continue
            a = agg.get(l['item_id'])
            if a is None:
                a = {'itemId': l['item_id'], 'name': item['name'], 'arabic': item.get('arabic'), 'qty': 0, 'notes': []}
                agg[l['item_id']] = a
            a['qty'] += l['qty']
            note = l.get('note')
            if note:
                existing = next((x for x in a['notes'] if x['note'] == note), None)
                if existing:
                    existing['count'] += l['qty']
                else:
                    a['notes'].append({'note': note, 'count': l['qty']})
    aggregate = sorted(agg.values(), key=lambda a: position.get(a['itemId'], 0))

    headcount = len(orders)  # submitters = delivery denominator
    shares = delivery_split(delivery_fee, headcount)

    per_person = []
    for i, o in enumerate(orders):
        items_total = sum(l['qty'] * l['unit_price'] for l in o['lines'])
        delivery_share = shares[i] if i < len(shares) else 0
        for_names = list(dict.fromkeys(l['for_name'] for l in o['lines'] if l.get('for_name')))
        per_person.append({
            'person': o['person'],
            'itemsTotal': items_total,
            'deliveryShare': delivery_share,
            'total': items_total + delivery_share,
            'paid': o['paid'],
            'forNames': for_names,
        })

    items_grand_total = sum(p['itemsTotal'] for p in per_person)
    return {
        'aggregate': aggregate,
        'itemsGrandTotal': items_grand_total,
        'deliveryFee': delivery_fee,
        'grandTotal': items_grand_total + delivery_fee,
        'perPerson': per_person,
        'headcount': headcount,
    }


def verify_exact(result: dict) -> bool:
    sum_people = sum(p['total'] for p in result['perPerson'])
    sum_shares = sum(p['deliveryShare'] for p in result['perPerson'])
    return sum_people == result['grandTotal'] and sum_shares == result['deliveryFee']
