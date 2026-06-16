from typing import Protocol, TypeVar


class OrderedItem(Protocol):
    display_order: int


T = TypeVar("T", bound=OrderedItem)


def configured_order(items: list[T]) -> list[T]:
    return sorted(items, key=lambda item: item.display_order)


def next_item(items: list[T], current_index: int) -> T | None:
    if not items:
        return None
    ordered = configured_order(items)
    return ordered[(current_index + 1) % len(ordered)]

