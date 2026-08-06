from __future__ import annotations

from typing import TYPE_CHECKING, Any

from app.application.display_orchestrator.sse_hub import get_display_sse_hub

if TYPE_CHECKING:
    from app.application.display_orchestrator.service import DisplayOrchestrator


def get_connected_kiosk_ids(orchestrator: DisplayOrchestrator) -> list[str]:
    return get_display_sse_hub().list_connected_kiosk_ids(
        orchestrator.organization_id,
        orchestrator.operator_session_id,
    )


def get_defer_count(state: dict[str, Any], content_id: str) -> int:
    counts = state.get("noveltyDeferCounts") or {}
    return int(counts.get(str(content_id), 0))


def increment_defer_count(orchestrator: DisplayOrchestrator, content_id: str) -> int:
    state = orchestrator._load_state()  # noqa: SLF001
    counts = dict(state.get("noveltyDeferCounts") or {})
    key = str(content_id)
    counts[key] = int(counts.get(key, 0)) + 1
    orchestrator._update_state({"noveltyDeferCounts": counts})  # noqa: SLF001
    return counts[key]


def prune_novelty_state(orchestrator: DisplayOrchestrator, content_id: str) -> None:
    state = orchestrator._load_state()  # noqa: SLF001
    key = str(content_id)
    counts = dict(state.get("noveltyDeferCounts") or {})
    ready = dict(state.get("noveltyReadyKiosks") or {})
    counts.pop(key, None)
    ready.pop(key, None)
    orchestrator._update_state(  # noqa: SLF001
        {
            "noveltyDeferCounts": counts,
            "noveltyReadyKiosks": ready,
        }
    )


def is_novelty_ready(state: dict[str, Any], content_id: str, connected_ids: list[str]) -> bool:
    if not connected_ids:
        return False
    ready_sets = state.get("noveltyReadyKiosks") or {}
    ready_kiosks = set(ready_sets.get(str(content_id), []))
    return all(kiosk_id in ready_kiosks for kiosk_id in connected_ids)


def record_novelty_ready(
    orchestrator: DisplayOrchestrator,
    kiosk_id: str,
    content_id: str,
) -> bool:
    state = orchestrator._load_state()  # noqa: SLF001
    ready = dict(state.get("noveltyReadyKiosks") or {})
    key = str(content_id)
    kiosk_list = list(ready.get(key, []))
    if kiosk_id not in kiosk_list:
        kiosk_list.append(kiosk_id)
        ready[key] = kiosk_list
        orchestrator._update_state({"noveltyReadyKiosks": ready})  # noqa: SLF001
    state = orchestrator._load_state()  # noqa: SLF001
    return is_novelty_ready(state, key, get_connected_kiosk_ids(orchestrator))


def remove_kiosk_from_ready_sets(orchestrator: DisplayOrchestrator, kiosk_id: str) -> None:
    state = orchestrator._load_state()  # noqa: SLF001
    ready = dict(state.get("noveltyReadyKiosks") or {})
    changed = False
    for key, kiosks in list(ready.items()):
        if kiosk_id in kiosks:
            ready[key] = [kid for kid in kiosks if kid != kiosk_id]
            changed = True
    if changed:
        orchestrator._update_state({"noveltyReadyKiosks": ready})  # noqa: SLF001


def trim_defer_counts(orchestrator: DisplayOrchestrator, new_max: int) -> None:
    state = orchestrator._load_state()  # noqa: SLF001
    counts = dict(state.get("noveltyDeferCounts") or {})
    trimmed = {key: min(value, new_max) for key, value in counts.items()}
    orchestrator._update_state({"noveltyDeferCounts": trimmed})  # noqa: SLF001
