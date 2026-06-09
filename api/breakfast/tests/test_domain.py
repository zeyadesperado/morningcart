"""Property tests for the pure money/aggregation logic — the Python twin of
web/shared's aggregate.test.ts. No Django needed:
    cd api && .venv/bin/python -m unittest breakfast.tests.test_domain -v
"""
import unittest

from hypothesis import given, settings
from hypothesis import strategies as st

from breakfast.domain import compute_result, delivery_split, verify_exact


class DeliverySplitTests(unittest.TestCase):
    @settings(max_examples=2000)
    @given(st.integers(min_value=0, max_value=600_000), st.integers(min_value=1, max_value=80))
    def test_sums_exact_and_fair(self, fee, n):
        s = delivery_split(fee, n)
        self.assertEqual(len(s), n)
        self.assertEqual(sum(s), fee)               # exact to the piaster
        self.assertLessEqual(max(s) - min(s), 1)    # fair: differ by at most 1
        self.assertTrue(all(x >= 0 for x in s))

    def test_documented_seed_cases(self):
        self.assertEqual(delivery_split(3000, 15), [200] * 15)
        self.assertEqual(delivery_split(3000, 12), [250] * 12)
        s14 = delivery_split(3000, 14)
        self.assertEqual(s14.count(215), 4)
        self.assertEqual(s14.count(214), 10)
        self.assertEqual(sum(s14), 3000)

    def test_edges(self):
        self.assertEqual(delivery_split(3000, 1), [3000])
        self.assertEqual(delivery_split(0, 5), [0, 0, 0, 0, 0])


MENU = [
    {'id': 'foul', 'name': 'Foul', 'arabic': None, 'kind': 'plate', 'sort_order': 0},
    {'id': 'tea', 'name': 'Tea', 'arabic': None, 'kind': 'drink', 'sort_order': 1},
]


def _order(person, paid, lines):
    return {'person': person, 'paid': paid, 'lines': lines}


def _line(item, qty, unit, note=None, forn=None):
    return {'item_id': item, 'qty': qty, 'unit_price': unit, 'note': note, 'for_name': forn}


class ComputeResultTests(unittest.TestCase):
    @settings(max_examples=500)
    @given(st.integers(min_value=0, max_value=10_000), st.integers(min_value=1, max_value=20))
    def test_invariant_holds(self, fee, n):
        orders = [_order(f'P{i}', False, [_line('foul', (i % 3) + 1, 800)]) for i in range(n)]
        r = compute_result(orders, MENU, fee)
        self.assertEqual(sum(p['total'] for p in r['perPerson']), r['itemsGrandTotal'] + fee)
        self.assertEqual(r['grandTotal'], r['itemsGrandTotal'] + fee)
        self.assertTrue(verify_exact(r))

    def test_on_behalf_does_not_add_a_delivery_head(self):
        orders = [
            _order('Ahmed', False, [_line('foul', 1, 800), _line('tea', 1, 300, forn='Ziad')]),
            _order('Salma', False, [_line('foul', 1, 800)]),
        ]
        r = compute_result(orders, MENU, 3000)
        self.assertEqual(r['headcount'], 2)  # submitters, not fed people
        ahmed = next(p for p in r['perPerson'] if p['person'] == 'Ahmed')
        self.assertIn('Ziad', ahmed['forNames'])
        self.assertEqual(sum(p['deliveryShare'] for p in r['perPerson']), 3000)


if __name__ == '__main__':
    unittest.main()
