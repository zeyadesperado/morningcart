"""Canonical seed data (Python port of web/shared's data.ts). Menu items use a
SHORT id that repeats across restaurants, so DB ids are namespaced per restaurant."""
from breakfast.domain import egp

COLLEAGUES: list[str] = []  # no predefined users — anyone types their own name to join

# (short_id, name, arabic, kind, price)
EL_SOBHY_MENU = [
    ('foul', 'Foul', 'فول', 'plate', egp(8)),
    ('taameya', "Ta'ameya", 'طعمية', 'plate', egp(6)),
    ('fries', 'Fries sandwich', 'ساندويتش بطاطس', 'plate', egp(7)),
    ('cheese', 'Cheese sandwich', 'ساندويتش جبنة', 'plate', egp(9)),
    ('eggs', 'Fried eggs', 'بيض', 'plate', egp(12)),
    ('basterma', 'Basterma & eggs', 'بسطرمة بيض', 'plate', egp(18)),
    ('bread', 'Baladi bread', 'عيش بلدي', 'extra', egp(2)),
    ('pickles', 'Pickles', 'مخلل', 'extra', egp(2)),
    ('tahina', 'Tahina', 'طحينة', 'extra', egp(3)),
    ('tea', 'Tea', 'شاي', 'drink', egp(3)),
    ('mint', 'Mint tea', 'شاي بالنعناع', 'drink', egp(4)),
    ('coffee', 'Turkish coffee', 'قهوة تركي', 'drink', egp(6)),
    ('nescafe', 'Nescafé', 'نسكافيه', 'drink', egp(9)),
]
ABOU_HASSAN_MENU = [
    ('foul', 'Foul Eskandarani', 'فول إسكندراني', 'plate', egp(10)),
    ('taameya', "Ta'ameya", 'طعمية', 'plate', egp(7)),
    ('liver', 'Alexandrian liver', 'كبدة', 'plate', egp(20)),
    ('sausage', 'Sausage sandwich', 'سجق', 'plate', egp(15)),
    ('cheese', 'Cheese sandwich', 'ساندويتش جبنة', 'plate', egp(10)),
    ('bread', 'Baladi bread', 'عيش بلدي', 'extra', egp(2)),
    ('tea', 'Tea', 'شاي', 'drink', egp(3)),
    ('coffee', 'Turkish coffee', 'قهوة تركي', 'drink', egp(7)),
]
RESTAURANTS = [
    {'id': 'el-sobhy', 'name': 'El Sobhy', 'arabic': 'الصبحي', 'delivery_fee': egp(30), 'menu': EL_SOBHY_MENU},
    {'id': 'abou-hassan', 'name': 'Abou Hassan', 'arabic': 'أبو حسن', 'delivery_fee': egp(25), 'menu': ABOU_HASSAN_MENU},
]

# (person, paid, [(short_item, qty, note, for_name), ...]) — all against 'el-sobhy'
OPEN_ORDERS = [
    ('Tarek', False, [('foul', 1, 'no oil', None), ('tea', 1, None, None), ('cheese', 1, None, 'Ziad')]),
    ('Karim', False, [('taameya', 1, None, None), ('foul', 1, None, None), ('coffee', 1, None, None)]),
    ('Salma', False, [('cheese', 1, None, None), ('nescafe', 1, 'extra hot', None)]),
    ('Ahmed', False, [('foul', 2, 'no oil', None), ('tea', 1, None, None)]),
    ('Mohamed', False, [('eggs', 1, None, None), ('bread', 2, None, None), ('tea', 1, None, None)]),
    ('Nour', False, [('taameya', 1, None, None), ('mint', 1, None, None)]),
    ('Hana', False, [('fries', 1, 'no pickles', None), ('tea', 1, None, None)]),
    ('Omar', False, [('basterma', 1, None, None), ('coffee', 1, None, None)]),
    ('Youssef', False, [('taameya', 2, None, None), ('foul', 1, None, None), ('tea', 1, None, None)]),
    ('Laila', False, [('cheese', 1, None, None), ('mint', 1, None, None)]),
    ('Mostafa', False, [('foul', 1, None, None), ('tahina', 1, None, None), ('tea', 1, None, None)]),
    ('Dina', False, [('fries', 1, None, None), ('nescafe', 1, None, None)]),
    ('Khaled', False, [('foul', 1, None, None), ('taameya', 1, None, None), ('coffee', 1, None, None), ('pickles', 1, None, None)]),
]
CLOSED_ORDERS = [
    ('Mariam', True, [('foul', 1, 'no oil', None), ('tea', 1, None, None)]),
    ('Tarek', True, [('cheese', 1, None, None), ('coffee', 1, None, None)]),
    ('Karim', False, [('taameya', 2, None, None), ('foul', 1, None, None), ('tea', 1, None, None)]),
    ('Salma', True, [('eggs', 1, None, None), ('bread', 1, None, None), ('nescafe', 1, None, None)]),
    ('Ahmed', False, [('foul', 2, None, None), ('tea', 1, 'no sugar', None)]),
    ('Nour', True, [('fries', 1, None, None), ('mint', 1, None, None)]),
    ('Omar', True, [('basterma', 1, None, None), ('coffee', 1, None, 'Ziad')]),
    ('Hana', False, [('cheese', 1, None, None), ('tea', 1, None, None)]),
    ('Youssef', True, [('foul', 1, None, None), ('taameya', 1, None, None), ('coffee', 1, None, None)]),
    ('Mostafa', True, [('eggs', 1, None, None), ('tea', 1, None, None)]),
    ('Laila', False, [('taameya', 1, None, None), ('mint', 1, None, None)]),
]


def item_db_id(restaurant_id: str, short_id: str) -> str:
    return f'{restaurant_id}__{short_id}'
