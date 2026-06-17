from dataclasses import dataclass
from typing import TypeVar


T = TypeVar("T")


@dataclass(frozen=True)
class EffectiveRotation:
    duration_seconds: int
    rotation_animation: str
    animation_duration_milliseconds: int


def configured_order(items: list[T]) -> list[T]:
    return sorted(items, key=lambda item: getattr(item, "display_order"))


def next_item(items: list[T], current_index: int) -> T:
    ordered = configured_order(items)
    if not ordered:
        raise ValueError("Cannot rotate an empty item list.")
    return ordered[(current_index - 1) % len(ordered)]


def resolve_effective_rotation(
    item_duration_seconds: int | None,
    item_rotation_animation: str | None,
    item_animation_duration_milliseconds: int | None,
    default_duration_seconds: int,
    default_rotation_animation: str,
    default_animation_duration_milliseconds: int
) -> EffectiveRotation:
    return EffectiveRotation(
        duration_seconds=item_duration_seconds or default_duration_seconds,
        rotation_animation=item_rotation_animation or default_rotation_animation,
        animation_duration_milliseconds=item_animation_duration_milliseconds or default_animation_duration_milliseconds
    )
