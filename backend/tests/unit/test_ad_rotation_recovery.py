from __future__ import annotations

from types import SimpleNamespace

import fakeredis
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.application.display_orchestrator import redis_state
from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.scheduler import OrchestratorScheduler
from app.application.display_orchestrator.service import DisplayOrchestrator
from app.application.display_orchestrator.sse_hub import get_display_sse_hub, reset_display_sse_hub
from app.repositories.models.ad import ClientAdItem
from app.services.bootstrap_service import bootstrap_mvp_data


class _RecordingScheduler(OrchestratorScheduler):
    def __init__(self) -> None:
        super().__init__(
            on_top_timer=lambda: None,
            on_ad_timer=lambda: None,
            on_availability_timer=lambda: None,
        )
        self.ad_cancel_count = 0

    def cancel_ad(self) -> None:
        self.ad_cancel_count += 1
        super().cancel_ad()


def _remote_state(**overrides: object) -> object:
    values = {
        "content_mode": "loop",
        "navigation_command": None,
        "ads_visible": True,
        "selected_fixed_content_id": None,
        "selected_iframe_id": None,
        "jump_to_content_id": None,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


@pytest.fixture
def orchestrator_env(db_session: Session) -> tuple[DisplayOrchestrator, Session, str, sessionmaker[Session]]:
    fake = fakeredis.FakeRedis(decode_responses=True)
    redis_state.reset_redis_client(fake)
    reset_display_sse_hub()
    get_display_sse_hub().start()
    bootstrap = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()
    org_id = bootstrap.organization.id
    factory = sessionmaker(bind=db_session.get_bind(), autoflush=False, autocommit=False, expire_on_commit=False)
    OrchestratorRegistry.configure(lambda: factory())
    orchestrator = OrchestratorRegistry.get_or_create(org_id, "session-1")
    yield orchestrator, db_session, org_id, factory
    orchestrator.shutdown()
    OrchestratorRegistry.reset()
    reset_display_sse_hub()
    redis_state.reset_redis_client(None)


def test_advance_ad_with_hidden_ads_cancels_timer(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str, sessionmaker[Session]],
) -> None:
    orchestrator, session, _org_id, _factory = orchestrator_env
    recording = _RecordingScheduler()
    orchestrator._scheduler = recording  # noqa: SLF001
    orchestrator.bootstrap(session)
    orchestrator._update_state({"adsVisible": False})  # noqa: SLF001

    orchestrator.advance_ad(session, reason="test")

    assert recording.ad_cancel_count == 1
    assert recording.has_ad_timer() is False


def test_ensure_ad_rotation_publishes_show_ads(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str, sessionmaker[Session]],
) -> None:
    orchestrator, session, org_id, _factory = orchestrator_env
    orchestrator.bootstrap(session)

    hub = get_display_sse_hub()
    registration = hub.register_kiosk(
        organization_id=org_id,
        operator_session_id=orchestrator.operator_session_id,
        client_instance_id="ad-recovery",
        label="Recovery kiosk",
    )
    subscriber = hub.subscribe(registration)
    while not subscriber.events.empty():
        subscriber.events.get_nowait()

    orchestrator.ensure_ad_rotation(session)

    event = subscriber.events.get(timeout=1.0)
    assert event["type"] == "show_ads"
    assert orchestrator._scheduler.has_ad_timer()  # noqa: SLF001


def test_ensure_ad_rotation_with_zero_ads_is_noop(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str, sessionmaker[Session]],
) -> None:
    orchestrator, session, org_id, _factory = orchestrator_env
    orchestrator.bootstrap(session)

    for ad in session.scalars(select(ClientAdItem).where(ClientAdItem.organization_id == org_id)):
        ad.is_active = False
    session.commit()

    orchestrator.ensure_ad_rotation(session)
    assert orchestrator._scheduler.has_ad_timer() is False  # noqa: SLF001


def test_repeated_ensure_ad_rotation_keeps_single_ad_timer(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str, sessionmaker[Session]],
) -> None:
    orchestrator, session, _org_id, _factory = orchestrator_env
    orchestrator.bootstrap(session)

    orchestrator.ensure_ad_rotation(session)
    assert orchestrator._scheduler.has_ad_timer()  # noqa: SLF001

    orchestrator.ensure_ad_rotation(session)
    assert orchestrator._scheduler.has_ad_timer()  # noqa: SLF001


def test_apply_remote_state_show_ads_after_hide(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str, sessionmaker[Session]],
) -> None:
    orchestrator, session, org_id, _factory = orchestrator_env
    recording = _RecordingScheduler()
    orchestrator._scheduler = recording  # noqa: SLF001
    orchestrator.bootstrap(session)

    orchestrator.apply_remote_state(session, _remote_state(ads_visible=False), reason="test_hide")
    assert recording.ad_cancel_count == 1

    hub = get_display_sse_hub()
    registration = hub.register_kiosk(
        organization_id=org_id,
        operator_session_id=orchestrator.operator_session_id,
        client_instance_id="hide-show",
        label="Hide show kiosk",
    )
    subscriber = hub.subscribe(registration)
    while not subscriber.events.empty():
        subscriber.events.get_nowait()

    orchestrator.apply_remote_state(session, _remote_state(ads_visible=True), reason="test_show")

    event = subscriber.events.get(timeout=1.0)
    assert event["type"] == "show_ads"
