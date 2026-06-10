from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from breakfast.data import CLOSED_ORDERS, OPEN_ORDERS, RESTAURANTS, item_db_id
from breakfast.models import MenuItem, Order, OrderLine, Restaurant, Session


def service_date(offset_days: int = 0) -> str:
    d = datetime.now(ZoneInfo(settings.OFFICE_TZ)) - timedelta(days=offset_days)
    return d.strftime('%Y-%m-%d')


class Command(BaseCommand):
    help = 'Seed the database with demo restaurants and sessions. Skips silently if data exists (use --force to wipe and reseed).'

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true', help='Wipe everything and reseed even if data exists.')

    @transaction.atomic
    def handle(self, *args, **options):
        if Restaurant.objects.exists() and not options['force']:
            self.stdout.write('Data already present — skipping seed (run with --force to wipe and reseed).')
            return
        # idempotent reset, FK-safe order
        OrderLine.objects.all().delete()
        Order.objects.all().delete()
        Session.objects.all().delete()
        MenuItem.objects.all().delete()
        Restaurant.objects.all().delete()

        el_sobhy_price = {}
        for r in RESTAURANTS:
            Restaurant.objects.create(id=r['id'], name=r['name'], arabic=r['arabic'], delivery_fee=r['delivery_fee'])
            for i, (short, name, arabic, kind, price) in enumerate(r['menu']):
                MenuItem.objects.create(
                    id=item_db_id(r['id'], short), restaurant_id=r['id'],
                    name=name, arabic=arabic, kind=kind, price=price, sort_order=i,
                )
                if r['id'] == 'el-sobhy':
                    el_sobhy_price[short] = price

        el_sobhy_fee = next(r['delivery_fee'] for r in RESTAURANTS if r['id'] == 'el-sobhy')

        def make_session(orders, status, sd, started_by):
            s = Session.objects.create(
                restaurant_id='el-sobhy', started_by=started_by, status=status,
                service_date=sd, delivery_fee=el_sobhy_fee,
                closed_at=(timezone.now() if status == 'closed' else None),
            )
            for person, paid, lines in orders:
                o = Order.objects.create(session=s, person=person, paid=paid)
                OrderLine.objects.bulk_create([
                    OrderLine(
                        order=o, menu_item_id=item_db_id('el-sobhy', short), qty=qty,
                        note=note, for_name=forn, unit_price=el_sobhy_price[short],
                    )
                    for (short, qty, note, forn) in lines
                ])

        make_session(OPEN_ORDERS, 'open', service_date(0), 'Omar')
        make_session(CLOSED_ORDERS, 'closed', service_date(1), 'Dina')

        counts = (
            Restaurant.objects.count(), MenuItem.objects.count(),
            Session.objects.count(), Order.objects.count(), OrderLine.objects.count(),
        )
        self.stdout.write(self.style.SUCCESS(
            'Seeded %d restaurants, %d menu items, %d sessions, %d orders, %d order lines.' % counts
        ))
