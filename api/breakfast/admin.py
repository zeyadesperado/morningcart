"""The back office: everything the API deliberately keeps simple — bulk menu
edits, price fixes, rescuing sessions, auditing who owes what — lives here.
Money is integer piasters in the DB and rendered as EGP everywhere."""
from django.contrib import admin, messages
from django.db import IntegrityError
from django.db.models import Count, Exists, F, OuterRef, Sum
from django.urls import reverse
from django.utils import timezone
from django.utils.html import format_html

from breakfast.domain import money
from breakfast.models import MenuItem, Order, OrderLine, PersonStats, Restaurant, Session

admin.site.site_header = '🌅 MorningCart admin'
admin.site.site_title = 'MorningCart admin'
admin.site.index_title = 'The counter — restaurants, menus, mornings, money'
admin.site.empty_value_display = '—'


def egp(p) -> str:
    return f'EGP {money(p)}' if p is not None else '—'


# ── Restaurants + menus ───────────────────────────────────────────────────────
class MenuItemInline(admin.TabularInline):
    model = MenuItem
    extra = 0
    fields = ('name', 'arabic', 'price', 'kind', 'available', 'sort_order')
    ordering = ('sort_order', 'name')


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = ('name', 'arabic', 'delivery_fee_egp', 'menu_size', 'state', 'open_now', 'created_at')
    list_filter = ('active',)
    search_fields = ('name', 'arabic')
    ordering = ('-active', 'name')
    inlines = [MenuItemInline]
    actions = ('activate', 'deactivate')

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .annotate(
                menu_count=Count('menu', distinct=True),
                has_open=Exists(Session.objects.filter(restaurant=OuterRef('pk'), status='open')),
            )
        )

    @admin.display(description='delivery', ordering='delivery_fee')
    def delivery_fee_egp(self, obj):
        return egp(obj.delivery_fee)

    @admin.display(description='items', ordering='menu_count')
    def menu_size(self, obj):
        return obj.menu_count

    @admin.display(description='state', ordering='active')
    def state(self, obj):
        if obj.active:
            return format_html('<b style="color:#46512F">✓ active</b>')
        return format_html('<span style="color:#A1431E">✕ deleted</span>')

    @admin.display(description='this morning', boolean=False)
    def open_now(self, obj):
        return format_html('<b style="color:#8a5e16">◗ open session</b>') if obj.has_open else '—'

    @admin.action(description='Restore selected restaurants (active=true)')
    def activate(self, request, queryset):
        n = queryset.update(active=True)
        self.message_user(request, f'{n} restaurant(s) restored.')

    @admin.action(description='Soft-delete selected restaurants (active=false)')
    def deactivate(self, request, queryset):
        blocked = queryset.annotate(
            has_open=Exists(Session.objects.filter(restaurant=OuterRef('pk'), status='open'))
        ).filter(has_open=True)
        if blocked.exists():
            names = ', '.join(blocked.values_list('name', flat=True))
            self.message_user(request, f'Skipped (open session running): {names}', level=messages.WARNING)
        n = queryset.exclude(pk__in=blocked).update(active=False)
        if n:
            self.message_user(request, f'{n} restaurant(s) soft-deleted.')


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'arabic', 'restaurant', 'price_egp', 'kind', 'available', 'sort_order', 'times_ordered')
    list_editable = ('available', 'sort_order')
    list_filter = ('restaurant', 'kind', 'available')
    search_fields = ('name', 'arabic')
    ordering = ('restaurant', 'sort_order', 'name')
    list_select_related = ('restaurant',)
    actions = ('make_available', 'make_unavailable')

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(ordered=Count('order_lines'))

    @admin.display(description='price', ordering='price')
    def price_egp(self, obj):
        return egp(obj.price)

    @admin.display(description='times ordered', ordering='ordered')
    def times_ordered(self, obj):
        return obj.ordered

    @admin.action(description='Mark available (orderable this morning)')
    def make_available(self, request, queryset):
        self.message_user(request, f'{queryset.update(available=True)} item(s) now available.')

    @admin.action(description='Mark unavailable (hidden from ordering)')
    def make_unavailable(self, request, queryset):
        self.message_user(request, f'{queryset.update(available=False)} item(s) hidden.')


# ── Sessions + orders ─────────────────────────────────────────────────────────
class OrderInline(admin.TabularInline):
    model = Order
    extra = 0
    fields = ('person', 'paid', 'summary', 'total_egp')
    readonly_fields = ('summary', 'total_egp')
    show_change_link = True

    @admin.display(description='order')
    def summary(self, obj):
        if not obj.pk:
            return '—'
        return ' · '.join(f'{l.qty}× {l.menu_item.name}' for l in obj.lines.select_related('menu_item'))

    @admin.display(description='items total')
    def total_egp(self, obj):
        if not obj.pk:
            return '—'
        return egp(sum(l.qty * l.unit_price for l in obj.lines.all()))


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = (
        'service_date', 'restaurant', 'state', 'headcount', 'items_total_egp',
        'delivery_egp', 'grand_total_egp', 'started_by', 'closed_at',
    )
    list_filter = ('status', 'restaurant', 'service_date')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    search_fields = ('started_by', 'orders__person')
    list_select_related = ('restaurant',)
    readonly_fields = ('created_at', 'closed_at')
    inlines = [OrderInline]
    actions = ('close_sessions', 'reopen_sessions', 'delete_empty_sessions')

    def get_actions(self, request):
        # the stock bulk delete would cascade through orders + lines and erase
        # settled history — only the guarded actions below may delete
        actions = super().get_actions(request)
        actions.pop('delete_selected', None)
        return actions

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .annotate(
                n_orders=Count('orders', distinct=True),
                items_total=Sum(F('orders__lines__qty') * F('orders__lines__unit_price')),
            )
        )

    @admin.display(description='status', ordering='status')
    def state(self, obj):
        if obj.status == 'open':
            return format_html('<b style="color:#8a5e16">◗ open</b>')
        return format_html('<span style="color:#46512F">■ closed</span>')

    @admin.display(description='people', ordering='n_orders')
    def headcount(self, obj):
        return obj.n_orders

    @admin.display(description='items', ordering='items_total')
    def items_total_egp(self, obj):
        return egp(obj.items_total) if obj.items_total else '—'

    @admin.display(description='delivery')
    def delivery_egp(self, obj):
        return egp(obj.delivery_fee if obj.delivery_fee is not None else obj.restaurant.delivery_fee)

    @admin.display(description='grand total')
    def grand_total_egp(self, obj):
        if not obj.items_total:
            return '—'
        fee = obj.delivery_fee if obj.delivery_fee is not None else obj.restaurant.delivery_fee
        return format_html('<b>{}</b>', egp(obj.items_total + fee))

    @admin.action(description='Close selected sessions (skips empty ones)')
    def close_sessions(self, request, queryset):
        skipped = 0
        closed = 0
        for s in queryset.filter(status='open'):
            if not s.orders.exists():
                skipped += 1  # closing an empty session strands the delivery fee
                continue
            s.status = 'closed'
            s.closed_at = timezone.now()
            s.save(update_fields=['status', 'closed_at'])
            closed += 1
        if closed:
            self.message_user(request, f'{closed} session(s) closed.')
        if skipped:
            self.message_user(request, f'{skipped} empty session(s) skipped — delete those instead.', level=messages.WARNING)

    @admin.action(description='Reopen selected sessions (override)')
    def reopen_sessions(self, request, queryset):
        for s in queryset.filter(status='closed'):
            # one breakfast per morning is office-wide, not per-restaurant —
            # the DB constraint alone wouldn't catch a different restaurant
            if Session.objects.filter(status='open', service_date=s.service_date).exists():
                self.message_user(
                    request,
                    f'{s.restaurant.name} · {s.service_date}: another breakfast is already open that day.',
                    level=messages.ERROR,
                )
                continue
            try:
                s.status = 'open'
                s.closed_at = None
                s.save(update_fields=['status', 'closed_at'])
                self.message_user(request, f'Reopened {s.restaurant.name} · {s.service_date}.')
            except IntegrityError:
                self.message_user(
                    request,
                    f'{s.restaurant.name} · {s.service_date}: another open session exists for that day.',
                    level=messages.ERROR,
                )

    @admin.action(description='Delete selected EMPTY open sessions')
    def delete_empty_sessions(self, request, queryset):
        empty = queryset.filter(status='open').annotate(n=Count('orders')).filter(n=0)
        n = empty.count()
        empty.delete()
        self.message_user(request, f'{n} empty session(s) deleted.')


class OrderLineInline(admin.TabularInline):
    model = OrderLine
    extra = 0
    fields = ('menu_item', 'qty', 'unit_price', 'note', 'for_name')
    autocomplete_fields = ('menu_item',)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('person', 'session_link', 'restaurant', 'paid', 'summary', 'items_total_egp', 'created_at')
    list_editable = ('paid',)
    list_filter = ('paid', 'session__status', 'session__restaurant')
    search_fields = ('person', 'lines__for_name', 'lines__menu_item__name')
    ordering = ('-created_at',)
    inlines = [OrderLineInline]

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related('session__restaurant')
            .annotate(items_total=Sum(F('lines__qty') * F('lines__unit_price')))
        )

    @admin.display(description='session', ordering='session__service_date')
    def session_link(self, obj):
        url = reverse('admin:breakfast_session_change', args=[obj.session_id])
        return format_html('<a href="{}">{} · {}</a>', url, obj.session.service_date, obj.session.status)

    @admin.display(description='restaurant')
    def restaurant(self, obj):
        return obj.session.restaurant.name

    @admin.display(description='order')
    def summary(self, obj):
        return ' · '.join(f'{l.qty}× {l.menu_item.name}' for l in obj.lines.select_related('menu_item'))

    @admin.display(description='items total', ordering='items_total')
    def items_total_egp(self, obj):
        return egp(obj.items_total)


# ── People (the app's "users" — names on orders, aggregated by a SQL view) ────
@admin.register(PersonStats)
class PersonStatsAdmin(admin.ModelAdmin):
    list_display = ('name', 'mornings', 'orders_count', 'unpaid', 'spent_egp', 'last_seen', 'orders_link')
    search_fields = ('name',)
    ordering = ('-last_seen',)
    list_display_links = None

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description='unpaid', ordering='unpaid_count')
    def unpaid(self, obj):
        if obj.unpaid_count:
            return format_html('<b style="color:#A1431E">{} unpaid</b>', obj.unpaid_count)
        return format_html('<span style="color:#46512F">✓ clear</span>')

    @admin.display(description='items spent', ordering='items_total')
    def spent_egp(self, obj):
        return egp(obj.items_total)

    @admin.display(description='')
    def orders_link(self, obj):
        url = reverse('admin:breakfast_order_changelist')
        return format_html('<a href="{}?q={}">view orders →</a>', url, obj.name)
