"""Endpoint tests: auth, validation, the session lifecycle, and the settlement
contract — everything the property tests in test_domain.py can't see.
Run: python manage.py test breakfast.tests.test_api  (needs a Postgres for the test DB)
"""
import json

from django.test import Client, TestCase

from breakfast.models import MenuItem, Order, Restaurant, Session


def post(c: Client, path: str, body: dict | None = None):
    return c.post(path, data=json.dumps(body) if body is not None else None, content_type='application/json')


def put(c: Client, path: str, body: dict):
    return c.put(path, data=json.dumps(body), content_type='application/json')


def patch(c: Client, path: str, body: dict):
    return c.patch(path, data=json.dumps(body), content_type='application/json')


def login(name: str) -> Client:
    c = Client()
    res = post(c, '/api/auth/login', {'name': name})
    assert res.status_code == 200, res.content
    return c


class AuthTests(TestCase):
    def test_login_sets_cookie_and_me_roundtrips(self):
        c = login('Salma')
        self.assertEqual(c.get('/api/auth/me').json()['user'], 'Salma')

    def test_arabic_name_logs_in_and_roundtrips(self):
        c = login('سلمى المرصفاوي')
        self.assertEqual(c.get('/api/auth/me').json()['user'], 'سلمى المرصفاوي')

    def test_whitespace_is_normalized(self):
        c = login('  Salma   Hashem ')
        self.assertEqual(c.get('/api/auth/me').json()['user'], 'Salma Hashem')

    def test_blank_and_overlong_names_rejected(self):
        c = Client()
        self.assertEqual(post(c, '/api/auth/login', {'name': '   '}).status_code, 400)
        self.assertEqual(post(c, '/api/auth/login', {'name': ''}).status_code, 422)
        self.assertEqual(post(c, '/api/auth/login', {'name': 'x' * 41}).status_code, 422)

    def test_mutations_require_cookie(self):
        c = Client()
        self.assertEqual(post(c, '/api/restaurants', {'name': 'X', 'deliveryFee': 0}).status_code, 401)
        self.assertEqual(c.get('/api/sessions/current').status_code, 401)

    def test_tampered_cookie_is_anonymous(self):
        c = login('Salma')
        c.cookies['mc_user'] = c.cookies['mc_user'].value + 'x'
        self.assertIsNone(c.get('/api/auth/me').json()['user'])


class ValidationTests(TestCase):
    def setUp(self):
        self.c = login('Salma')

    def test_restaurant_name_blank_or_overlong_rejected(self):
        self.assertEqual(post(self.c, '/api/restaurants', {'name': '   ', 'deliveryFee': 0}).status_code, 400)
        self.assertEqual(post(self.c, '/api/restaurants', {'name': 'x' * 201, 'deliveryFee': 0}).status_code, 422)
        self.assertEqual(post(self.c, '/api/restaurants', {'name': 'OK', 'deliveryFee': -1}).status_code, 422)

    def test_item_kind_must_be_known(self):
        r = post(self.c, '/api/restaurants', {'name': 'Cart', 'deliveryFee': 1000}).json()['restaurant']
        res = post(self.c, f"/api/restaurants/{r['id']}/items", {'name': 'Foul', 'price': 800, 'kind': 'dessert'})
        self.assertEqual(res.status_code, 422)

    def test_errors_are_json_even_for_unknown_routes_input(self):
        res = post(self.c, '/api/restaurants', {'name': 'x' * 5000, 'deliveryFee': 0})
        self.assertEqual(res.status_code, 422)
        self.assertIn('error', res.json())


class LifecycleTests(TestCase):
    def setUp(self):
        self.salma = login('Salma')
        self.tarek = login('Tarek')
        r = post(self.salma, '/api/restaurants', {'name': 'El Sobhy', 'arabic': 'الصبحي', 'deliveryFee': 3000})
        self.rest = r.json()['restaurant']
        self.items = {}
        for name, price in [('Foul', 800), ('Tea', 300)]:
            res = post(self.salma, f"/api/restaurants/{self.rest['id']}/items", {'name': name, 'price': price})
            self.items[name] = next(m for m in res.json()['restaurant']['menu'] if m['name'] == name)

    def start(self):
        return post(self.salma, '/api/sessions', {'restaurantId': self.rest['id']}).json()['session']

    def test_full_flow_and_settlement_invariant(self):
        s = self.start()
        put(self.salma, f"/api/sessions/{s['id']}/order", {'lines': [{'menuItemId': self.items['Foul']['id'], 'qty': 2}]})
        put(self.tarek, f"/api/sessions/{s['id']}/order", {'lines': [{'menuItemId': self.items['Tea']['id'], 'qty': 1}]})
        res = post(self.salma, f"/api/sessions/{s['id']}/close").json()
        result = res['result']
        self.assertEqual(result['itemsGrandTotal'], 2 * 800 + 300)
        self.assertEqual(result['grandTotal'], result['itemsGrandTotal'] + 3000)
        self.assertEqual(sum(p['total'] for p in result['perPerson']), result['grandTotal'])
        self.assertEqual(sum(p['deliveryShare'] for p in result['perPerson']), 3000)

    def test_upsert_replaces_not_duplicates(self):
        s = self.start()
        for _ in range(2):
            put(self.salma, f"/api/sessions/{s['id']}/order", {'lines': [{'menuItemId': self.items['Foul']['id'], 'qty': 1}]})
        session = self.salma.get(f"/api/sessions/{s['id']}").json()['session']
        mine = [o for o in session['orders'] if o['person'] == 'Salma']
        self.assertEqual(len(mine), 1)
        self.assertEqual(len(mine[0]['lines']), 1)

    def test_delivery_fee_snapshot_survives_restaurant_edits(self):
        s = self.start()
        put(self.salma, f"/api/sessions/{s['id']}/order", {'lines': [{'menuItemId': self.items['Foul']['id'], 'qty': 1}]})
        post(self.salma, f"/api/sessions/{s['id']}/close")
        patch(self.salma, f"/api/restaurants/{self.rest['id']}", {'deliveryFee': 9999})
        result = self.salma.get(f"/api/sessions/{s['id']}/result").json()['result']
        self.assertEqual(result['deliveryFee'], 3000)  # not 9999

    def test_order_modification_blocked_after_close(self):
        s = self.start()
        put(self.salma, f"/api/sessions/{s['id']}/order", {'lines': [{'menuItemId': self.items['Foul']['id'], 'qty': 1}]})
        post(self.salma, f"/api/sessions/{s['id']}/close")
        res = put(self.tarek, f"/api/sessions/{s['id']}/order", {'lines': [{'menuItemId': self.items['Tea']['id'], 'qty': 1}]})
        self.assertEqual(res.status_code, 409)
        self.assertEqual(self.tarek.delete(f"/api/sessions/{s['id']}/order").status_code, 409)

    def test_empty_close_blocked_but_cancel_works(self):
        s = self.start()
        self.assertEqual(post(self.salma, f"/api/sessions/{s['id']}/close").status_code, 400)
        self.assertEqual(self.salma.delete(f"/api/sessions/{s['id']}").status_code, 200)
        self.assertFalse(Session.objects.filter(id=s['id']).exists())

    def test_cancel_session_with_orders_blocked(self):
        s = self.start()
        put(self.salma, f"/api/sessions/{s['id']}/order", {'lines': [{'menuItemId': self.items['Foul']['id'], 'qty': 1}]})
        self.assertEqual(self.salma.delete(f"/api/sessions/{s['id']}").status_code, 409)

    def test_double_close_is_idempotent(self):
        s = self.start()
        put(self.salma, f"/api/sessions/{s['id']}/order", {'lines': [{'menuItemId': self.items['Foul']['id'], 'qty': 1}]})
        first = post(self.salma, f"/api/sessions/{s['id']}/close").json()
        second = post(self.tarek, f"/api/sessions/{s['id']}/close").json()
        self.assertEqual(first['result']['grandTotal'], second['result']['grandTotal'])

    def test_one_session_per_morning_across_restaurants(self):
        other = post(self.salma, '/api/restaurants', {'name': 'Abou Hassan', 'deliveryFee': 2500}).json()['restaurant']
        s1 = self.start()
        s2 = post(self.tarek, '/api/sessions', {'restaurantId': other['id']}).json()['session']
        self.assertEqual(s1['id'], s2['id'])

    def test_current_returns_open_then_closed_session(self):
        s = self.start()
        self.assertEqual(self.tarek.get('/api/sessions/current').json()['session']['id'], s['id'])
        put(self.salma, f"/api/sessions/{s['id']}/order", {'lines': [{'menuItemId': self.items['Foul']['id'], 'qty': 1}]})
        post(self.salma, f"/api/sessions/{s['id']}/close")
        cur = self.tarek.get('/api/sessions/current').json()['session']
        self.assertEqual(cur['id'], s['id'])
        self.assertEqual(cur['status'], 'closed')

    def test_session_carries_full_restaurant_menu(self):
        s = self.start()
        self.assertEqual(len(s['restaurant']['menu']), 2)
        self.assertTrue(s['restaurant']['active'])

    def test_unavailable_item_rejected(self):
        s = self.start()
        patch(self.salma, f"/api/restaurants/{self.rest['id']}/items/{self.items['Foul']['id']}", {'available': False})
        res = put(self.salma, f"/api/sessions/{s['id']}/order", {'lines': [{'menuItemId': self.items['Foul']['id'], 'qty': 1}]})
        self.assertEqual(res.status_code, 400)

    def test_qty_bounds(self):
        s = self.start()
        bad = put(self.salma, f"/api/sessions/{s['id']}/order", {'lines': [{'menuItemId': self.items['Foul']['id'], 'qty': 21}]})
        self.assertEqual(bad.status_code, 422)
        ok = put(self.salma, f"/api/sessions/{s['id']}/order", {'lines': [{'menuItemId': self.items['Foul']['id'], 'qty': 20}]})
        self.assertEqual(ok.status_code, 200)

    def test_soft_delete_guard_and_inactive_start_blocked(self):
        s = self.start()
        res = patch(self.salma, f"/api/restaurants/{self.rest['id']}", {'active': False})
        self.assertEqual(res.status_code, 409)  # open session
        put(self.salma, f"/api/sessions/{s['id']}/order", {'lines': [{'menuItemId': self.items['Foul']['id'], 'qty': 1}]})
        post(self.salma, f"/api/sessions/{s['id']}/close")
        self.assertEqual(patch(self.salma, f"/api/restaurants/{self.rest['id']}", {'active': False}).status_code, 200)
        self.assertEqual(post(self.salma, '/api/sessions', {'restaurantId': self.rest['id']}).status_code, 400)

    def test_toggle_paid(self):
        s = self.start()
        put(self.salma, f"/api/sessions/{s['id']}/order", {'lines': [{'menuItemId': self.items['Foul']['id'], 'qty': 1}]})
        post(self.salma, f"/api/sessions/{s['id']}/close")
        oid = Order.objects.get(session_id=s['id'], person='Salma').id
        res = patch(self.tarek, f'/api/orders/{oid}', {'paid': True})
        self.assertTrue(res.json()['order']['paid'])
