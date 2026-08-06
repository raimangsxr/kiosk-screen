import fakeredis

from app.api.schemas import EventBrandingSchema, KioskConfigurationSchema
from app.application.display_orchestrator import redis_state
from app.application.display_orchestrator.sse_hub import DisplaySseHub, reset_display_sse_hub
from uuid import uuid4


def _configuration(**overrides) -> KioskConfigurationSchema:
    values = {
        "id": uuid4(),
        "name": "Main",
        "topRegionRatio": 5,
        "bottomRegionRatio": 1,
        "defaultTopDurationSeconds": 10,
        "defaultAdDurationSeconds": 8,
        "defaultTopRotationAnimation": "none",
        "defaultAdRotationAnimation": "none",
        "defaultTopAnimationDurationMilliseconds": 300,
        "defaultAdAnimationDurationMilliseconds": 300,
        "inlineAdCount": 1,
        "inlineAdItemBorderRadiusPx": 5,
        "inlineAdItemBorderWidthPx": 0,
        "inlineAdItemBorderColor": "#ffffff",
        "remoteControlPollingSeconds": 3,
        "videoEndDelaySeconds": 2,
        "isEnabled": True,
    }
    values.update(overrides)
    return KioskConfigurationSchema(**values)


def test_publish_config_updated_fans_out_to_two_subscribers() -> None:
    fake = fakeredis.FakeRedis(decode_responses=True)
    redis_state.reset_redis_client(fake)
    reset_display_sse_hub()
    hub = DisplaySseHub()

    org_id = str(uuid4())
    session_id = str(uuid4())
    reg_a = hub.register_kiosk(
        organization_id=org_id,
        operator_session_id=session_id,
        client_instance_id="a",
        label=None,
    )
    reg_b = hub.register_kiosk(
        organization_id=org_id,
        operator_session_id=session_id,
        client_instance_id="b",
        label=None,
    )
    sub_a = hub.subscribe(reg_a)
    sub_b = hub.subscribe(reg_b)

    before = _configuration()
    after = _configuration(id=before.id, topRegionRatio=7)
    hub.publish_config_updated(
        organization_id=org_id,
        operator_session_id=session_id,
        before=before,
        after=after,
    )

    event_a = sub_a.events.get(timeout=1)
    event_b = sub_b.events.get(timeout=1)
    assert event_a["type"] == "config_updated"
    assert event_b["type"] == "config_updated"
    assert event_a["payload"]["configuration"]["topRegionRatio"] == 7
    assert event_b["payload"]["configuration"]["topRegionRatio"] == 7
    assert event_a["payload"]["applyImmediately"] is True
    assert set(event_a["payload"]["configuration"].keys()) == {"id", "topRegionRatio"}

    reset_display_sse_hub()
    redis_state.reset_redis_client(None)


def test_publish_branding_updated_fans_out_to_two_subscribers() -> None:
    fake = fakeredis.FakeRedis(decode_responses=True)
    redis_state.reset_redis_client(fake)
    reset_display_sse_hub()
    hub = DisplaySseHub()

    org_id = str(uuid4())
    session_id = str(uuid4())
    reg_a = hub.register_kiosk(
        organization_id=org_id,
        operator_session_id=session_id,
        client_instance_id="a",
        label=None,
    )
    reg_b = hub.register_kiosk(
        organization_id=org_id,
        operator_session_id=session_id,
        client_instance_id="b",
        label=None,
    )
    sub_a = hub.subscribe(reg_a)
    sub_b = hub.subscribe(reg_b)

    branding = EventBrandingSchema(
        eventName="Gala 2026",
        organizerName="Acme",
        organizerLogoUrl="/api/media/files/logo.png",
    )
    hub.publish_branding_updated(
        organization_id=org_id,
        operator_session_id=session_id,
        branding=branding,
    )

    event_a = sub_a.events.get(timeout=1)
    event_b = sub_b.events.get(timeout=1)
    assert event_a["type"] == "branding_updated"
    assert event_b["payload"]["eventName"] == "Gala 2026"

    reset_display_sse_hub()
    redis_state.reset_redis_client(None)


def test_publish_does_not_duplicate_events_via_local_pubsub_listener() -> None:
    fake = fakeredis.FakeRedis(decode_responses=True)
    redis_state.reset_redis_client(fake)
    reset_display_sse_hub()
    hub = DisplaySseHub()
    hub.start()

    org_id = str(uuid4())
    session_id = str(uuid4())
    registration = hub.register_kiosk(
        organization_id=org_id,
        operator_session_id=session_id,
        client_instance_id="a",
        label=None,
    )
    subscriber = hub.subscribe(registration)
    while not subscriber.events.empty():
        subscriber.events.get_nowait()

    hub.publish(
        organization_id=org_id,
        operator_session_id=session_id,
        event_type="show_content",
        payload={"commandId": "cmd-1", "content": {"id": "content-1"}},
    )

    event = subscriber.events.get(timeout=1)
    assert event["type"] == "show_content"
    assert subscriber.events.empty()

    hub.stop()
    reset_display_sse_hub()
    redis_state.reset_redis_client(None)


def test_list_registrations_excludes_kiosks_without_active_stream() -> None:
    fake = fakeredis.FakeRedis(decode_responses=True)
    redis_state.reset_redis_client(fake)
    reset_display_sse_hub()
    hub = DisplaySseHub()
    org_id = str(uuid4())
    session_id = str(uuid4())
    registration = hub.register_kiosk(
        organization_id=org_id,
        operator_session_id=session_id,
        client_instance_id="a",
        label="Pantalla A",
    )

    assert hub.list_registrations(org_id) == []

    subscriber = hub.subscribe(registration)
    assert hub.list_registrations(org_id) == [registration]

    hub.unsubscribe(subscriber.connection_id)
    assert hub.list_registrations(org_id) == []

    reset_display_sse_hub()
    redis_state.reset_redis_client(None)


def test_connection_audit_debounced_within_window() -> None:
    hub = DisplaySseHub()
    kiosk_id = str(uuid4())
    # First connect/disconnect for a kiosk is always recorded; a rapid repeat
    # (reconnect storm, or register + stream-open for a single connect) is
    # coalesced. A different kiosk is unaffected.
    assert hub._should_record_conn_audit(kiosk_id) is True  # noqa: SLF001
    assert hub._should_record_conn_audit(kiosk_id) is False  # noqa: SLF001
    assert hub._should_record_conn_audit(str(uuid4())) is True  # noqa: SLF001


def test_enqueue_signals_bound_event_loop() -> None:
    import asyncio

    fake = fakeredis.FakeRedis(decode_responses=True)
    redis_state.reset_redis_client(fake)
    reset_display_sse_hub()
    hub = DisplaySseHub()

    org_id = str(uuid4())
    session_id = str(uuid4())
    registration = hub.register_kiosk(
        organization_id=org_id,
        operator_session_id=session_id,
        client_instance_id="a",
        label=None,
    )
    subscriber = hub.subscribe(registration)

    loop = asyncio.new_event_loop()
    try:
        wakeup: asyncio.Event | None = None

        async def _bind() -> None:
            nonlocal wakeup
            wakeup = asyncio.Event()
            subscriber.bind_loop(asyncio.get_running_loop(), wakeup)

        loop.run_until_complete(_bind())
        assert wakeup is not None and not wakeup.is_set()

        # Publishing from this (non-loop) thread must wake the awaiting consumer
        # via call_soon_threadsafe without blocking a worker thread.
        hub.publish(
            organization_id=org_id,
            operator_session_id=session_id,
            event_type="show_content",
            payload={"commandId": "cmd-1", "content": {"id": "content-1"}},
        )
        loop.run_until_complete(asyncio.sleep(0))

        assert wakeup.is_set()
        assert subscriber.events.get_nowait()["type"] == "show_content"
    finally:
        loop.close()
        reset_display_sse_hub()
        redis_state.reset_redis_client(None)


def test_subscriber_queue_bounded_drop_oldest() -> None:
    fake = fakeredis.FakeRedis(decode_responses=True)
    redis_state.reset_redis_client(fake)
    reset_display_sse_hub()
    hub = DisplaySseHub()

    org_id = str(uuid4())
    session_id = str(uuid4())
    registration = hub.register_kiosk(
        organization_id=org_id,
        operator_session_id=session_id,
        client_instance_id="a",
        label=None,
    )
    subscriber = hub.subscribe(registration)

    for index in range(100):
        hub.publish(
            organization_id=org_id,
            operator_session_id=session_id,
            event_type="show_content",
            payload={"commandId": f"cmd-{index}", "content": {"id": f"content-{index}"}},
        )

    assert subscriber.events.qsize() <= 64
    first = subscriber.events.get_nowait()
    assert first["payload"]["commandId"] == "cmd-36"

    reset_display_sse_hub()
    redis_state.reset_redis_client(None)
