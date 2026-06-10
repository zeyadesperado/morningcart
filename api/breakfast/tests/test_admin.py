"""Admin smoke tests: every changelist loads, the guarded actions behave, the
People view aggregates, and — critically — enabling admin middleware did not
break the cookie-auth API (ninja views stay csrf_exempt)."""
import json

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse

from breakfast.models import MenuItem, Order, OrderLine, Restaurant, Session

CHANGELISTS = [
    'breakfast_restaurant',
    'breakfast_menuitem',
    'breakfast_session',
    'breakfast_order',
    'breakfast_personstats',
]


def seed_minimal():
    r = Restaurant.objects.create(name='El Sobhy', arabic='الصبحي', delivery_fee=3000)
    foul = MenuItem.objects.create(restaurant=r, name='Foul', price=800)
    s = Session.objects.create(restaurant=r, started_by='Salma', service_date='2026-06-10', delivery_fee=3000)
    o = Order.objects.create(session=s, person='Salma')
    OrderLine.objects.create(order=o, menu_item=foul, qty=2, unit_price=800)
    return r, foul, s, o


class AdminSmokeTests(TestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_superuser('boss', password='morning-counter-1')
        self.c = Client()
        self.c.force_login(self.admin)
        self.r, self.foul, self.s, self.o = seed_minimal()

    def test_index_loads(self):
        res = self.c.get(reverse('admin:index'))
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, 'MorningCart')

    def test_every_changelist_loads(self):
        for name in CHANGELISTS:
            res = self.c.get(reverse(f'admin:{name}_changelist'))
            self.assertEqual(res.status_code, 200, name)

    def test_changelists_require_staff(self):
        anon = Client()
        res = anon.get(reverse('admin:breakfast_session_changelist'))
        self.assertEqual(res.status_code, 302)  # -> login

    def test_restaurant_change_page_with_menu_inline(self):
        res = self.c.get(reverse('admin:breakfast_restaurant_change', args=[self.r.id]))
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, 'Foul')

    def test_session_change_page_with_orders_inline(self):
        res = self.c.get(reverse('admin:breakfast_session_change', args=[self.s.id]))
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, 'Salma')

    def test_person_stats_view_aggregates(self):
        res = self.c.get(reverse('admin:breakfast_personstats_changelist'))
        self.assertContains(res, 'Salma')
        self.assertContains(res, '16.00')  # 2 × 8.00 EGP items total

    def test_close_action_closes_but_skips_empty(self):
        empty = Session.objects.create(
            restaurant=self.r, started_by='Tarek', service_date='2026-06-11', delivery_fee=3000
        )
        self.c.post(
            reverse('admin:breakfast_session_changelist'),
            {'action': 'close_sessions', '_selected_action': [self.s.id, empty.id]},
        )
        self.s.refresh_from_db()
        empty.refresh_from_db()
        self.assertEqual(self.s.status, 'closed')
        self.assertIsNotNone(self.s.closed_at)
        self.assertEqual(empty.status, 'open')  # skipped — would strand the fee

    def test_deactivate_action_skips_restaurant_with_open_session(self):
        self.c.post(
            reverse('admin:breakfast_restaurant_changelist'),
            {'action': 'deactivate', '_selected_action': [self.r.id]},
        )
        self.r.refresh_from_db()
        self.assertTrue(self.r.active)  # open session running -> skipped

    def test_delete_empty_sessions_action(self):
        empty = Session.objects.create(
            restaurant=self.r, started_by='Tarek', service_date='2026-06-12', delivery_fee=3000
        )
        self.c.post(
            reverse('admin:breakfast_session_changelist'),
            {'action': 'delete_empty_sessions', '_selected_action': [empty.id, self.s.id]},
        )
        self.assertFalse(Session.objects.filter(id=empty.id).exists())
        self.assertTrue(Session.objects.filter(id=self.s.id).exists())  # has orders


class EnsureAdminTests(TestCase):
    """The boot-time superuser bootstrap must be create-only and validator-backed."""

    def run_cmd(self, **env):
        import os
        from unittest import mock

        from django.core.management import call_command

        with mock.patch.dict(os.environ, env, clear=False):
            call_command('ensure_admin')

    def test_creates_superuser_first_boot(self):
        self.run_cmd(ADMIN_USERNAME='boss2', ADMIN_PASSWORD='morning-counter-9')
        u = get_user_model().objects.get(username='boss2')
        self.assertTrue(u.is_superuser)
        self.assertTrue(u.check_password('morning-counter-9'))

    def test_never_clobbers_existing_password(self):
        get_user_model().objects.create_superuser('boss3', password='original-pass-123')
        self.run_cmd(ADMIN_USERNAME='boss3', ADMIN_PASSWORD='different-pass-456', ADMIN_FORCE_PASSWORD='false')
        self.assertTrue(get_user_model().objects.get(username='boss3').check_password('original-pass-123'))

    def test_force_reset_rotates_password(self):
        get_user_model().objects.create_superuser('boss4', password='original-pass-123')
        self.run_cmd(ADMIN_USERNAME='boss4', ADMIN_PASSWORD='rotated-pass-789', ADMIN_FORCE_PASSWORD='true')
        self.assertTrue(get_user_model().objects.get(username='boss4').check_password('rotated-pass-789'))

    def test_weak_password_fails_loudly(self):
        from django.core.management.base import CommandError

        with self.assertRaises(CommandError):
            self.run_cmd(ADMIN_USERNAME='boss5', ADMIN_PASSWORD='short')
        self.assertFalse(get_user_model().objects.filter(username='boss5').exists())


class ApiCsrfRegressionTests(TestCase):
    """The admin brought CsrfViewMiddleware — the JSON API must stay exempt."""

    def test_api_post_without_csrf_token_still_works(self):
        strict = Client(enforce_csrf_checks=True)
        res = strict.post('/api/auth/login', data=json.dumps({'name': 'Salma'}), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['user'], 'Salma')

    def test_admin_post_does_require_csrf(self):
        get_user_model().objects.create_superuser('boss', password='morning-counter-1')
        strict = Client(enforce_csrf_checks=True)
        res = strict.post('/admin/login/', {'username': 'boss', 'password': 'morning-counter-1'})
        self.assertEqual(res.status_code, 403)  # no token -> rejected, as it should be
