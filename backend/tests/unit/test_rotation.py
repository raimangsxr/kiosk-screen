from dataclasses import dataclass

from app.domain.rotation import configured_order, next_item


@dataclass(frozen=True)
class Item:
    display_order: int


def test_rotation_uses_configured_order():
    items = [Item(2), Item(1)]

    assert [item.display_order for item in configured_order(items)] == [1, 2]
    assert next_item(items, 1).display_order == 1

