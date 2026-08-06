from __future__ import annotations

import logging
import threading
import time
from collections.abc import Callable

logger = logging.getLogger(__name__)

AVAILABILITY_TICK_SECONDS = 30.0


class OrchestratorScheduler:
    """Independent top, ad, and availability timers (FR-012).

    A single daemon worker thread owns all three timers, sleeping until the
    nearest deadline and firing due callbacks. This replaces the previous
    design, which spawned a fresh ``threading.Timer`` (and therefore a new OS
    thread) on every arm/re-arm — thousands of short-lived threads over a
    multi-hour event. Re-arming a timer now just updates a deadline and wakes
    the worker via a condition variable.

    The public surface (``arm_top`` / ``arm_ad`` / ``arm_availability`` /
    ``cancel_*``) is preserved so the orchestrator keeps compiling unchanged.
    Callbacks fire sequentially on the worker thread; this matches the
    orchestrator's expectation that each tick opens its own DB session and
    avoids concurrent ticks from the same orchestrator racing.
    """

    def __init__(
        self,
        *,
        on_top_timer: Callable[[], None],
        on_ad_timer: Callable[[], None],
        on_availability_timer: Callable[[], None] | None = None,
    ) -> None:
        self._callbacks: dict[str, Callable[[], None] | None] = {
            "top": on_top_timer,
            "ad": on_ad_timer,
            "availability": on_availability_timer,
        }
        self._cond = threading.Condition(threading.Lock())
        self._deadlines: dict[str, float] = {}
        self._last_seconds: dict[str, float] = {}
        self._stopped = False
        self._thread = threading.Thread(
            target=self._run,
            name="orchestrator-scheduler",
            daemon=True,
        )
        self._thread.start()

    def arm_top(self, seconds: float) -> None:
        self._arm("top", seconds)

    def arm_ad(self, seconds: float) -> None:
        self._arm("ad", seconds)

    def arm_availability(self, seconds: float = AVAILABILITY_TICK_SECONDS) -> None:
        if self._callbacks["availability"] is None:
            return
        self._arm("availability", seconds)

    def cancel_top(self) -> None:
        self._cancel("top")

    def cancel_ad(self) -> None:
        self._cancel("ad")

    def has_top_timer(self) -> bool:
        with self._cond:
            return "top" in self._deadlines

    def has_ad_timer(self) -> bool:
        with self._cond:
            return "ad" in self._deadlines

    def cancel_all(self) -> None:
        with self._cond:
            self._deadlines.clear()
            self._cond.notify()

    def shutdown(self) -> None:
        """Stop the worker thread. Called from ``DisplayOrchestrator.shutdown``
        so a retired orchestrator does not leak its scheduler thread."""
        with self._cond:
            self._stopped = True
            self._deadlines.clear()
            self._cond.notify()

    def _arm(self, kind: str, seconds: float) -> None:
        with self._cond:
            if self._stopped:
                return
            self._last_seconds[kind] = seconds
            self._deadlines[kind] = time.monotonic() + max(0.01, seconds)
            self._cond.notify()

    def _cancel(self, kind: str) -> None:
        with self._cond:
            self._deadlines.pop(kind, None)
            self._cond.notify()

    def _run(self) -> None:
        while True:
            with self._cond:
                if self._stopped:
                    return
                if not self._deadlines:
                    self._cond.wait()
                    continue
                now = time.monotonic()
                next_deadline = min(self._deadlines.values())
                if next_deadline > now:
                    self._cond.wait(timeout=next_deadline - now)
                    continue
                due = [kind for kind, deadline in self._deadlines.items() if deadline <= now]
                for kind in due:
                    del self._deadlines[kind]
                fire = [(kind, self._callbacks[kind]) for kind in due]

            for kind, callback in fire:
                if callback is not None:
                    try:
                        callback()
                    except Exception:  # pragma: no cover - defensive
                        logger.exception("Orchestrator scheduler callback %s failed", kind)
                        # A throwing tick would otherwise stop that rotation for
                        # good; re-arm with the last known cadence so a transient
                        # failure self-heals (R6).
                        if kind in ("top", "ad"):
                            last = self._last_seconds.get(kind)
                            if last is not None:
                                self._arm(kind, last)
                if kind == "availability":
                    # Availability ticks on a fixed cadence until cancelled.
                    self.arm_availability()
