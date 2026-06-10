import secrets

from django.db import models


def gen_id() -> str:
    return secrets.token_hex(12)


class Restaurant(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=gen_id)
    name = models.CharField(max_length=200)
    arabic = models.CharField(max_length=200, null=True, blank=True)
    delivery_fee = models.IntegerField()  # piasters; split across submitters at close
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class MenuItem(models.Model):
    id = models.CharField(primary_key=True, max_length=80, default=gen_id)
    restaurant = models.ForeignKey(Restaurant, related_name='menu', on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    arabic = models.CharField(max_length=200, null=True, blank=True)
    price = models.IntegerField()  # piasters
    kind = models.CharField(max_length=16, default='plate')  # plate | drink | extra
    available = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        indexes = [models.Index(fields=['restaurant'])]

    def __str__(self):
        return self.name


class Session(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=gen_id)
    restaurant = models.ForeignKey(Restaurant, related_name='sessions', on_delete=models.PROTECT)
    started_by = models.CharField(max_length=80)
    status = models.CharField(max_length=16, default='open')  # open | closed
    service_date = models.CharField(max_length=10)  # YYYY-MM-DD, office-local
    # snapshot at start — editing the restaurant later must not rewrite settlements
    delivery_fee = models.IntegerField(null=True, blank=True)  # piasters
    created_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            # only one OPEN session per restaurant per service day (closed unrestricted)
            models.UniqueConstraint(
                fields=['restaurant', 'service_date'],
                condition=models.Q(status='open'),
                name='one_open_session_per_restaurant_per_day',
            )
        ]
        indexes = [models.Index(fields=['restaurant', 'status'])]

    def __str__(self):
        return f'{self.service_date} · {self.restaurant_id} · {self.status}'


class Order(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=gen_id)
    session = models.ForeignKey(Session, related_name='orders', on_delete=models.CASCADE)
    person = models.CharField(max_length=80)
    paid = models.BooleanField(default=False)  # the entire "payment" surface
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['session', 'person'], name='one_order_per_person'),
        ]
        indexes = [models.Index(fields=['session'])]

    def __str__(self):
        return f'{self.person} ({"paid" if self.paid else "unpaid"})'


class OrderLine(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=gen_id)
    order = models.ForeignKey(Order, related_name='lines', on_delete=models.CASCADE)
    menu_item = models.ForeignKey(MenuItem, related_name='order_lines', on_delete=models.PROTECT)
    qty = models.IntegerField()
    note = models.CharField(max_length=200, null=True, blank=True)
    for_name = models.CharField(max_length=80, null=True, blank=True)  # on-behalf; never a delivery head
    unit_price = models.IntegerField()  # snapshot at add time

    class Meta:
        indexes = [models.Index(fields=['order'])]


class PersonStats(models.Model):
    """Read-only "users" surface for the admin. The app has no user table —
    people are names on orders — so this is a SQL VIEW aggregating them
    (created in migration 0003)."""
    name = models.CharField(primary_key=True, max_length=80)
    orders_count = models.IntegerField()
    mornings = models.IntegerField()
    unpaid_count = models.IntegerField()  # closed sessions, still unpaid
    items_total = models.BigIntegerField()  # piasters, excl. delivery shares
    last_seen = models.DateTimeField(null=True)

    class Meta:
        managed = False
        db_table = 'breakfast_person_stats'
        verbose_name = 'person'
        verbose_name_plural = 'people'

    def __str__(self):
        return self.name
