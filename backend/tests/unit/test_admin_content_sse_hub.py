import queue
import time
from uuid import uuid4

import fakeredis
import pytest

from app.application.admin_content.sse_hub import AdminContentSseHub, reset_admin_content_sse_hub
from app.application.display_orchestrator import redis_state


def test_publish_fans_out_to_two_subscribers_same_org() -> None:
    fake = fakeredis.FakeRedis(decode_responses=True)
    redis_state.reset_redis_client(fake)
    reset_admin_content_sse_hub()
    hub = AdminContentSseHub()

    org_id = str(uuid4())
    sub_a = hub.subscribe(org_id)
    sub_b = hub.subscribe(org_id)

    hub.publish(org_id, reason="mutation")

    event_a = sub_a.events.get(timeout=1)
    event_b = sub_b.events.get(timeout=1)
    assert event_a["type"] == "content_inventory_changed"
    assert event_b["type"] == "content_inventory_changed"
    assert event_a["reason"] == "mutation"
    assert event_b["reason"] == "mutation"

    reset_admin_content_sse_hub()
    redis_state.reset_redis_client(None)


def test_publish_does_not_fan_out_to_other_org() -> None:
    fake = fakeredis.FakeRedis(decode_responses=True)
    redis_state.reset_redis_client(fake)
    reset_admin_content_sse_hub()
    hub = AdminContentSseHub()

    org_a = str(uuid4())
    org_b = str(uuid4())
    sub_a = hub.subscribe(org_a)
    sub_b = hub.subscribe(org_b)

    hub.publish(org_a, reason="mutation")

    assert sub_a.events.get(timeout=1)["type"] == "content_inventory_changed"
    with pytest.raises(queue.Empty):
        sub_b.events.get(timeout=0.2)

    reset_admin_content_sse_hub()
    redis_state.reset_redis_client(None)


def test_redis_publish_reaches_subscriber_on_other_replica() -> None:
    fake = fakeredis.FakeRedis(decode_responses=True)
    redis_state.reset_redis_client(fake)
    reset_admin_content_sse_hub()

    publisher = AdminContentSseHub()
    listener = AdminContentSseHub()
    listener.start()
    time.sleep(0.15)

    org_id = str(uuid4())
    subscriber = listener.subscribe(org_id)

    publisher.publish(org_id, reason="novelty_consumed")

    event = subscriber.events.get(timeout=2)
    assert event["type"] == "content_inventory_changed"
    assert event["reason"] == "novelty_consumed"

    listener.stop()
    reset_admin_content_sse_hub()
    redis_state.reset_redis_client(None)


def test_publish_now_playing_changed_fanout() -> None:
    hub = AdminContentSseHub()
    org_id = str(uuid4())
    subscriber = hub.subscribe(org_id)
    hub.publish_now_playing_changed(org_id, content_id="item-1", title="Agenda")
    event = subscriber.events.get(timeout=1)
    assert event["type"] == "now_playing_changed"
    assert event["contentId"] == "item-1"
    assert event["title"] == "Agenda"
