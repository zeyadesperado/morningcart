import logging
import time
from typing import Literal

from django.db import IntegrityError, transaction
from django.db.models import Prefetch, ProtectedError
from django.http import HttpResponse
from ninja import NinjaAPI, Schema
from ninja.errors import HttpError, ValidationError
from pydantic import Field

from breakfast.auth import clear_user, current_user, require_user, set_user
from breakfast.data import COLLEAGUES
from breakfast.domain import compute_result
from breakfast.models import MenuItem, Order, OrderLine, Restaurant, Session

log = logging.getLogger('breakfast')

api = NinjaAPI(title='MorningCart API')

# Match the Node error contract: { error: "..." } instead of Ninja's { detail }.
@api.exception_handler(HttpError)
def _http_error(request, exc):
    return api.create_response(request, {'error': str(exc)}, status=exc.status_code)


@api.exception_handler(ValidationError)
def _validation_error(request, exc):
    return api.create_response(request, {'error': 'Invalid request', 'details': exc.errors}, status=422)


@api.exception_handler(Exception)
def _server_error(request, exc):
    # Keep the JSON error contract even for bugs (instead of an HTML 500 page),
    # and make sure the traceback lands in the server log with DEBUG=false.
    log.exception('Unhandled API error: %s %s', request.method, request.path)
    return api.create_response(request, {'error': 'Internal server error'}, status=500)


# ── request schemas (the Zod twins) ──────────────────────────────────────────
# Field bounds mirror the model max_lengths so bad input fails as a 422 with
# the JSON error contract instead of a DB-level 500.
ItemKind = Literal['plate', 'drink', 'extra']


class LoginIn(Schema):
    name: str = Field(min_length=1, max_length=40)


class StartIn(Schema):
    restaurantId: str = Field(max_length=64)


class RestaurantIn(Schema):
    name: str = Field(min_length=1, max_length=200)
    arabic: str | None = Field(default=None, max_length=200)
    deliveryFee: int = Field(ge=0, le=10_000_000)


class RestaurantPatch(Schema):
    name: str | None = Field(default=None, max_length=200)
    arabic: str | None = Field(default=None, max_length=200)
    deliveryFee: int | None = Field(default=None, ge=0, le=10_000_000)
    active: bool | None = None


class ItemIn(Schema):
    name: str = Field(min_length=1, max_length=200)
    arabic: str | None = Field(default=None, max_length=200)
    price: int = Field(ge=0, le=10_000_000)
    kind: ItemKind = 'plate'
    sortOrder: int = Field(default=0, ge=0, le=1_000_000)


class ItemPatch(Schema):
    name: str | None = Field(default=None, max_length=200)
    arabic: str | None = Field(default=None, max_length=200)
    price: int | None = Field(default=None, ge=0, le=10_000_000)
    kind: ItemKind | None = None
    available: bool | None = None
    sortOrder: int | None = Field(default=None, ge=0, le=1_000_000)


class OrderLineIn(Schema):
    menuItemId: str = Field(max_length=80)
    qty: int = Field(ge=1, le=20)
    note: str | None = Field(default=None, max_length=200)
    forName: str | None = Field(default=None, max_length=80)


class OrderIn(Schema):
    lines: list[OrderLineIn] = Field(min_length=1, max_length=60)


class PaidIn(Schema):
    paid: bool


def clean_name(raw: str, what: str = 'name', max_len: int = 200) -> str:
    """Collapse whitespace; reject blank — '  ' must not become a real name."""
    name = ' '.join(raw.split())
    if not name:
        raise HttpError(400, f'Invalid {what}')
    if len(name) > max_len:
        raise HttpError(400, f'{what} is too long')
    return name


# ── loaders + serializers ─────────────────────────────────────────────────────
MENU_QS = MenuItem.objects.order_by('sort_order', 'name')
ORDERS_QS = Order.objects.order_by('created_at', 'id').prefetch_related('lines')


def load_restaurant(rid: str) -> Restaurant:
    r = Restaurant.objects.filter(id=rid).prefetch_related(Prefetch('menu', queryset=MENU_QS)).first()
    if not r:
        raise HttpError(404, 'Restaurant not found')
    return r


def load_session(sid: str) -> Session:
    s = (
        Session.objects.select_related('restaurant')
        .prefetch_related(
            Prefetch('restaurant__menu', queryset=MENU_QS),
            Prefetch('orders', queryset=ORDERS_QS),
        )
        .filter(id=sid)
        .first()
    )
    if not s:
        raise HttpError(404, 'Session not found')
    return s


def lock_session(sid: str) -> Session:
    """Row-lock the session inside the caller's transaction so order writes and
    close/cancel serialize — no closing a session mid-upsert, no duplicate lines."""
    s = Session.objects.select_for_update().filter(id=sid).first()
    if not s:
        raise HttpError(404, 'Session not found')
    return s


def session_fee(s: Session) -> int:
    # snapshot taken at start; fall back to the live fee for pre-migration rows
    return s.delivery_fee if s.delivery_fee is not None else s.restaurant.delivery_fee


def ser_item(m: MenuItem) -> dict:
    return {'id': m.id, 'name': m.name, 'arabic': m.arabic, 'price': m.price,
            'kind': m.kind, 'available': m.available, 'sortOrder': m.sort_order}


def ser_restaurant(r: Restaurant) -> dict:
    return {
        'id': r.id, 'name': r.name, 'arabic': r.arabic, 'deliveryFee': r.delivery_fee, 'active': r.active,
        'menu': [ser_item(m) for m in r.menu.all()],
    }


def ser_session(s: Session) -> dict:
    r = s.restaurant
    name_of = {m.id: m for m in r.menu.all()}
    return {
        'id': s.id, 'restaurantId': r.id, 'startedBy': s.started_by, 'status': s.status,
        'serviceDate': s.service_date,
        'createdAt': s.created_at.isoformat(),
        'closedAt': s.closed_at.isoformat() if s.closed_at else None,
        # full restaurant (incl. menu) so the client never depends on the
        # active-only /restaurants list to render a session
        'restaurant': {'id': r.id, 'name': r.name, 'arabic': r.arabic,
                       'deliveryFee': session_fee(s), 'active': r.active,
                       'menu': [ser_item(m) for m in r.menu.all()]},
        'orders': [
            {
                'id': o.id, 'person': o.person, 'paid': o.paid,
                'lines': [
                    {
                        'menuItemId': l.menu_item_id,
                        'name': name_of[l.menu_item_id].name if l.menu_item_id in name_of else l.menu_item_id,
                        'arabic': name_of[l.menu_item_id].arabic if l.menu_item_id in name_of else None,
                        'qty': l.qty, 'note': l.note, 'forName': l.for_name, 'unitPrice': l.unit_price,
                    }
                    for l in o.lines.all()
                ],
            }
            for o in s.orders.all()
        ],
    }


def result_for(s: Session) -> dict:
    r = s.restaurant
    fee = session_fee(s)
    orders = [
        {
            'person': o.person, 'paid': o.paid,
            'lines': [
                {'item_id': l.menu_item_id, 'qty': l.qty, 'unit_price': l.unit_price, 'note': l.note, 'for_name': l.for_name}
                for l in o.lines.all()
            ],
        }
        for o in s.orders.all()
    ]
    menu = [{'id': m.id, 'name': m.name, 'arabic': m.arabic, 'kind': m.kind, 'sort_order': m.sort_order} for m in r.menu.all()]
    return {
        'sessionId': s.id, 'status': s.status, 'serviceDate': s.service_date,
        'restaurant': {'id': r.id, 'name': r.name, 'arabic': r.arabic, 'deliveryFee': fee},
        'result': compute_result(orders, menu, fee),
    }


def service_date_today() -> str:
    from datetime import datetime
    from zoneinfo import ZoneInfo
    from django.conf import settings
    return datetime.now(ZoneInfo(settings.OFFICE_TZ)).strftime('%Y-%m-%d')


# ── health + identity ─────────────────────────────────────────────────────────
@api.get('/health')
def health(request):
    return {'ok': True, 'ts': int(time.time() * 1000)}


@api.get('/auth/me')
def me(request):
    return {'user': current_user(request)}


@api.get('/colleagues')
def colleagues(request):
    return {'colleagues': COLLEAGUES}


@api.post('/auth/login')
def login(request, data: LoginIn, response: HttpResponse):
    name = clean_name(data.name, 'name', max_len=40)
    if COLLEAGUES:
        match = next((c for c in COLLEAGUES if c.lower() == name.lower()), None)
        if not match:
            raise HttpError(400, 'Unknown colleague — pick a name from the list')
        name = match
    set_user(response, name)
    return {'user': name}


@api.post('/auth/logout')
def logout(request, response: HttpResponse):
    clear_user(response)
    return {'ok': True}


# ── restaurants / menu (setup) ────────────────────────────────────────────────
@api.get('/restaurants')
def list_restaurants(request):
    rows = Restaurant.objects.filter(active=True).prefetch_related(Prefetch('menu', queryset=MENU_QS)).order_by('name')
    return {'restaurants': [ser_restaurant(r) for r in rows]}


@api.post('/restaurants')
def create_restaurant(request, data: RestaurantIn):
    require_user(request)
    r = Restaurant.objects.create(name=clean_name(data.name), arabic=data.arabic, delivery_fee=data.deliveryFee)
    return {'restaurant': ser_restaurant(load_restaurant(r.id))}


@api.patch('/restaurants/{rid}')
def patch_restaurant(request, rid: str, data: RestaurantPatch):
    require_user(request)
    r = load_restaurant(rid)
    if data.active is False and r.active and Session.objects.filter(restaurant_id=rid, status='open').exists():
        raise HttpError(409, 'There is an open breakfast on this restaurant — close it first')
    if data.name is not None:
        r.name = clean_name(data.name)
    if data.arabic is not None:
        r.arabic = data.arabic.strip() or None
    if data.deliveryFee is not None:
        r.delivery_fee = data.deliveryFee
    if data.active is not None:
        r.active = data.active
    r.save()
    return {'restaurant': ser_restaurant(load_restaurant(rid))}


@api.post('/restaurants/{rid}/items')
def add_item(request, rid: str, data: ItemIn):
    require_user(request)
    load_restaurant(rid)
    MenuItem.objects.create(
        restaurant_id=rid, name=clean_name(data.name), arabic=data.arabic,
        price=data.price, kind=data.kind, sort_order=data.sortOrder,
    )
    return {'restaurant': ser_restaurant(load_restaurant(rid))}


@api.patch('/restaurants/{rid}/items/{item_id}')
def patch_item(request, rid: str, item_id: str, data: ItemPatch):
    require_user(request)
    fields = {}
    if data.name is not None:
        fields['name'] = clean_name(data.name)
    if data.arabic is not None:
        fields['arabic'] = data.arabic.strip() or None
    if data.price is not None:
        fields['price'] = data.price
    if data.kind is not None:
        fields['kind'] = data.kind
    if data.available is not None:
        fields['available'] = data.available
    if data.sortOrder is not None:
        fields['sort_order'] = data.sortOrder
    updated = MenuItem.objects.filter(id=item_id, restaurant_id=rid).update(**fields) if fields else 0
    if updated == 0 and not MenuItem.objects.filter(id=item_id, restaurant_id=rid).exists():
        raise HttpError(404, 'Menu item not found')
    return {'restaurant': ser_restaurant(load_restaurant(rid))}


@api.delete('/restaurants/{rid}/items/{item_id}')
def delete_item(request, rid: str, item_id: str):
    require_user(request)
    try:
        removed, _ = MenuItem.objects.filter(id=item_id, restaurant_id=rid).delete()
    except ProtectedError:
        raise HttpError(409, 'Item is used by existing orders — set it unavailable instead')
    if removed == 0:
        raise HttpError(404, 'Menu item not found')
    return {'restaurant': ser_restaurant(load_restaurant(rid))}


# ── sessions ──────────────────────────────────────────────────────────────────
@api.get('/sessions/open')
def open_session(request, restaurantId: str | None = None):
    require_user(request)
    q = Session.objects.filter(status='open', service_date=service_date_today())
    if restaurantId:
        q = q.filter(restaurant_id=restaurantId)
    s = q.order_by('created_at').first()  # oldest first: the first-started session is THE session
    if not s:
        raise HttpError(404, 'Open session not found')
    return {'session': ser_session(load_session(s.id))}


@api.get('/sessions/current')
def current_session(request):
    """Today's session, open OR closed — so the settlement stays reachable for
    everyone (not just whoever pressed close) until the next morning."""
    require_user(request)
    today = service_date_today()
    s = Session.objects.filter(status='open', service_date=today).order_by('created_at').first()
    if not s:
        s = Session.objects.filter(status='closed', service_date=today).order_by('-closed_at').first()
    if not s:
        raise HttpError(404, 'No session today')
    return {'session': ser_session(load_session(s.id))}


@api.post('/sessions')
def start_session(request, data: StartIn):
    person = require_user(request)
    r = load_restaurant(data.restaurantId)
    if not r.active:
        raise HttpError(400, 'That restaurant was deleted')
    service_date = service_date_today()
    # one breakfast per morning for the whole office — joining an existing run
    # (even on another restaurant) beats forking the group across two vendors
    existing = Session.objects.filter(status='open', service_date=service_date).order_by('created_at').first()
    if existing:
        return {'session': ser_session(load_session(existing.id))}
    try:
        created = Session.objects.create(
            restaurant_id=r.id, started_by=person, service_date=service_date,
            status='open', delivery_fee=r.delivery_fee,
        )
    except IntegrityError:
        # race: another request opened it between our check and insert
        existing = Session.objects.filter(status='open', service_date=service_date).order_by('created_at').first()
        if not existing:
            raise
        return {'session': ser_session(load_session(existing.id))}
    return {'session': ser_session(load_session(created.id))}


@api.get('/sessions/{sid}')
def get_session(request, sid: str):
    require_user(request)
    return {'session': ser_session(load_session(sid))}


@api.put('/sessions/{sid}/order')
def upsert_order(request, sid: str, data: OrderIn):
    person = require_user(request)
    with transaction.atomic():
        s = lock_session(sid)
        if s.status != 'open':
            raise HttpError(409, 'Ordering is closed')
        menu = {m.id: m for m in MenuItem.objects.filter(restaurant_id=s.restaurant_id)}
        for l in data.lines:
            if l.menuItemId not in menu:
                raise HttpError(400, f'Unknown item {l.menuItemId}')
            if not menu[l.menuItemId].available:
                raise HttpError(400, f'"{menu[l.menuItemId].name}" is not available today')
        order, _ = Order.objects.get_or_create(session=s, person=person)
        order.lines.all().delete()
        OrderLine.objects.bulk_create([
            OrderLine(
                order=order, menu_item_id=l.menuItemId, qty=l.qty,
                note=l.note, for_name=l.forName, unit_price=menu[l.menuItemId].price,  # snapshot
            )
            for l in data.lines
        ])
    return {'session': ser_session(load_session(sid))}


@api.delete('/sessions/{sid}/order')
def cancel_order(request, sid: str):
    person = require_user(request)
    with transaction.atomic():
        s = lock_session(sid)
        if s.status != 'open':
            raise HttpError(409, 'Ordering is closed')
        Order.objects.filter(session_id=sid, person=person).delete()
    return {'session': ser_session(load_session(sid))}


@api.post('/sessions/{sid}/close')
def close_session(request, sid: str):
    require_user(request)
    from django.utils import timezone
    with transaction.atomic():
        s = lock_session(sid)
        if s.status == 'open':
            if not Order.objects.filter(session_id=sid).exists():
                raise HttpError(400, 'Cannot close a session with no orders — cancel it instead')
            Session.objects.filter(id=sid).update(status='closed', closed_at=timezone.now())
    return result_for(load_session(sid))


@api.delete('/sessions/{sid}')
def cancel_session(request, sid: str):
    """Abandon an empty open session (wrong restaurant, nobody's eating)."""
    require_user(request)
    with transaction.atomic():
        s = lock_session(sid)
        if s.status != 'open':
            raise HttpError(409, 'Session is already closed')
        if Order.objects.filter(session_id=sid).exists():
            raise HttpError(409, 'Session has orders — close it instead')
        Session.objects.filter(id=sid).delete()
    return {'ok': True}


@api.get('/sessions/{sid}/result')
def session_result(request, sid: str):
    require_user(request)
    return result_for(load_session(sid))


# ── orders ────────────────────────────────────────────────────────────────────
@api.patch('/orders/{oid}')
def toggle_paid(request, oid: str, data: PaidIn):
    # Deliberately not owner-scoped: whoever fronted the cash marks people paid.
    # Small trusting group; the checklist is shared state, not a wallet.
    require_user(request)
    updated = Order.objects.filter(id=oid).update(paid=data.paid)
    if updated == 0:
        raise HttpError(404, 'Order not found')
    o = Order.objects.get(id=oid)
    return {'order': {'id': o.id, 'person': o.person, 'paid': o.paid}}
