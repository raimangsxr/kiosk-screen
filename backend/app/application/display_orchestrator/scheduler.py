from __future__ import annotations

import threading
from collections.abc import Callable

AVAILABILITY_TICK_SECONDS = 30.0


class OrchestratorScheduler:
    """Independent top, ad, and availability timers (FR-012)."""

    def __init__(
        self,
        *,
        on_top_timer: Callable[[], None],
        on_ad_timer: Callable[[], None],
        on_availability_timer: Callable[[], None] | None = None,
    ) -> None:
        self._on_top_timer = on_top_timer
        self._on_ad_timer = on_ad_timer
        self._on_availability_timer = on_availability_timer
        self._lock = threading.RLock()
        self._top_timer: threading.Timer | None = None
        self._ad_timer: threading.Timer | None = None
        self._availability_timer: threading.Timer | None = None

    def arm_top(self, seconds: float) -> None:
        with self._lock:
            self._cancel_top_locked()
            timer = threading.Timer(max(0.01, seconds), self._on_top_timer)
            timer.daemon = True
            self._top_timer = timer
            timer.start()

    def arm_ad(self, seconds: float) -> None:
        with self._lock:
            self._cancel_ad_locked()
            timer = threading.Timer(max(0.01, seconds), self._on_ad_timer)
            timer.daemon = True
            self._ad_timer = timer
            timer.start()

    def arm_availability(self, seconds: float = AVAILABILITY_TICK_SECONDS) -> None:
        if self._on_availability_timer is None:
            return
        with self._lock:
            self._cancel_availability_locked()
            timer = threading.Timer(max(0.01, seconds), self._fire_availability_timer)
            timer.daemon = True
            self._availability_timer = timer
            timer.start()

    def cancel_top(self) -> None:
        with self._lock:
            self._cancel_top_locked()

    def cancel_ad(self) -> None:
        with self._lock:
            self._cancel_ad_locked()

    def cancel_all(self) -> None:
        with self._lock:
            self._cancel_top_locked()
            self._cancel_ad_locked()
            self._cancel_availability_locked()

    def _fire_availability_timer(self) -> None:
        if self._on_availability_timer is not None:
            self._on_availability_timer()
        self.arm_availability()

    def _cancel_top_locked(self) -> None:
        if self._top_timer is not None:
            self._top_timer.cancel()
            self._top_timer = None

    def _cancel_ad_locked(self) -> None:
        if self._ad_timer is not None:
            self._ad_timer.cancel()
            self._ad_timer = None

    def _cancel_availability_locked(self) -> None:
        if self._availability_timer is not None:
            self._availability_timer.cancel()
            self._availability_timer = None
