import time

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

api = NinjaAPI(title='MorningCart API')

# Match the Node error contract: { error: "..." } instead of Ninja's { detail }.
@api.exception_handler(HttpError)
def _http_error(request, exc):
    return api.create_response(request, {'error': str(exc)}, status=exc.status_code)


@api.exception_handler(ValidationError)
def _validation_error(request, exc):
    return api.create_response(request, {'error': 'Invalid request', 'details': exc.errors}, status=422)


# ── request schemas (the Zod twins) ──────────────────────────────────────────
class LoginIn(Schema):
    name: str


class StartIn(Schema):
    restaurantId: str


class RestaurantIn(Schema):
    name: str
    arabic: str | None = None
    deliveryFee: int = Field(ge=0)


class RestaurantPatch(Schema):
    name: str | None = None
    arabic: str | None = None
    deliveryFee: int | None = Field(default=None, ge=0)
    active: bool | None = None


class ItemIn(Schema):
    name: str
    arabic: str | None = None
    price: int = Field(ge=0)
    kind: str = 'plate'
    sortOrder: int = 0


class ItemPatch(Schema):
    name: str | None = None
    arabic: str | None = None
    price: int | None = Field(default=None, ge=0)
    kind: str | None = None
    available: bool | None = None
    sortOrder: int | None = None


class OrderLineIn(Schema):
    menuItemId: str
    qty: int = Field(ge=1, le=10)
    note: str | None = None
    forName: str | None = None


class OrderIn(Schema):
    lines: list[OrderLineIn] = Field(min_length=1)


class PaidIn(Schema):
    paid: bool


# ── loaders + serializers ─────────────────────────────────────────────────────
MENU_QS = MenuItem.objects.order_by('sort_order', 'name')


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
            Prefetch('orders', queryset=Order.objects.order_by('created_at').prefetch_related('lines')),
        )
        .filter(id=sid)
        .first()
    )
    if not s:
        raise HttpError(404, 'Session not found')
    return s


def ser_restaurant(r: Restaurant) -> dict:
    return {
        'id': r.id, 'name': r.name, 'arabic': r.arabic, 'deliveryFee': r.delivery_fee, 'active': r.active,
        'menu': [
            {'id': m.id, 'name': m.name, 'arabic': m.arabic, 'price': m.price,
             'kind': m.kind, 'available': m.available, 'sortOrder': m.sort_order}
            for m in r.menu.all()
        ],
    }


def ser_session(s: Session) -> dict:
    r = s.restaurant
    name_of = {m.id: m for m in r.menu.all()}
    return {
        'id': s.id, 'restaurantId': r.id, 'startedBy': s.started_by, 'status': s.status,
        'serviceDate': s.service_date,
        'createdAt': s.created_at.isoformat(),
        'closedAt': s.closed_at.isoformat() if s.closed_at else None,
        'restaurant': {'id': r.id, 'name': r.name, 'arabic': r.arabic, 'deliveryFee': r.delivery_fee},
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
        'restaurant': {'id': r.id, 'name': r.name, 'arabic': r.arabic, 'deliveryFee': r.delivery_fee},
        'result': compute_result(orders, menu, r.delivery_fee),
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
    name = data.name.strip()
    if not name or len(name) > 40:
        raise HttpError(400, 'Invalid name')
    match = next((c for c in COLLEAGUES if c.lower() == name.lower()), None)
    if not match:
        raise HttpError(400, 'Unknown colleague — pick a name from the list')
    set_user(response, match)
    return {'user': match}


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
    r = Restaurant.objects.create(name=data.name.strip(), arabic=data.arabic, delivery_fee=data.deliveryFee)
    return {'restaurant': ser_restaurant(load_restaurant(r.id))}


@api.patch('/restaurants/{rid}')
def patch_restaurant(request, rid: str, data: RestaurantPatch):
    require_user(request)
    r = load_restaurant(rid)
    if data.name is not None:
        r.name = data.name.strip()
    if data.arabic is not None:
        r.arabic = data.arabic
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
        restaurant_id=rid, name=data.name.strip(), arabic=data.arabic,
        price=data.price, kind=data.kind, sort_order=data.sortOrder,
    )
    return {'restaurant': ser_restaurant(load_restaurant(rid))}


@api.patch('/restaurants/{rid}/items/{item_id}')
def patch_item(request, rid: str, item_id: str, data: ItemPatch):
    require_user(request)
    fields = {}
    if data.name is not None:
        fields['name'] = data.name.strip()
    if data.arabic is not None:
        fields['arabic'] = data.arabic
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
    q = Session.objects.filter(status='open')
    if restaurantId:
        q = q.filter(restaurant_id=restaurantId)
    s = q.order_by('-created_at').first()
    if not s:
        raise HttpError(404, 'Open session not found')
    return {'session': ser_session(load_session(s.id))}


@api.post('/sessions')
def start_session(request, data: StartIn):
    person = require_user(request)
    r = load_restaurant(data.restaurantId)
    service_date = service_date_today()
    existing = Session.objects.filter(restaurant_id=r.id, status='open', service_date=service_date).first()
    if existing:
        return {'session': ser_session(load_session(existing.id))}
    try:
        created = Session.objects.create(restaurant_id=r.id, started_by=person, service_date=service_date, status='open')
    except IntegrityError:
        # race: another request opened it between our check and insert
        existing = Session.objects.filter(restaurant_id=r.id, status='open', service_date=service_date).first()
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
    s = load_session(sid)
    if s.status != 'open':
        raise HttpError(409, 'Ordering is closed')
    menu = {m.id: m for m in s.restaurant.menu.all()}
    for l in data.lines:
        if l.menuItemId not in menu:
            raise HttpError(400, f'Unknown item {l.menuItemId}')
    with transaction.atomic():
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
    s = load_session(sid)
    if s.status != 'open':
        raise HttpError(409, 'Ordering is closed')
    Order.objects.filter(session_id=sid, person=person).delete()
    return {'session': ser_session(load_session(sid))}


@api.post('/sessions/{sid}/close')
def close_session(request, sid: str):
    require_user(request)
    s = load_session(sid)
    if s.status == 'open' and len(s.orders.all()) == 0:
        raise HttpError(400, 'Cannot close a session with no orders — it would strand the delivery fee')
    if s.status == 'open':
        from django.utils import timezone
        Session.objects.filter(id=sid).update(status='closed', closed_at=timezone.now())
    return result_for(load_session(sid))


@api.get('/sessions/{sid}/result')
def session_result(request, sid: str):
    require_user(request)
    return result_for(load_session(sid))


# ── orders ────────────────────────────────────────────────────────────────────
@api.patch('/orders/{oid}')
def toggle_paid(request, oid: str, data: PaidIn):
    require_user(request)
    updated = Order.objects.filter(id=oid).update(paid=data.paid)
    if updated == 0:
        raise HttpError(404, 'Order not found')
    o = Order.objects.get(id=oid)
    return {'order': {'id': o.id, 'person': o.person, 'paid': o.paid}}
