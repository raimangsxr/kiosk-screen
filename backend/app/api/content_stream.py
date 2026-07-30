from __future__ import annotations

import asyncio
import contextlib
import json
import queue
import time
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.application.admin_content.hooks import get_now_playing_for_org
from app.application.admin_content.sse_hub import PING_INTERVAL_SECONDS, get_admin_content_sse_hub
from app.auth.dependencies import CurrentUser, get_current_user
from app.repositories.session import get_session

router = APIRouter(prefix="/admin/content", tags=["Admin Content Stream"])

STREAM_QUEUE_POLL_SECONDS = 1.0


def _format_sse_event(envelope: dict) -> str:
    event_type = envelope.get("type", "message")
    data = json.dumps(envelope, separators=(",", ":"))
    return f"event: {event_type}\ndata: {data}\n\n"


@router.get("/stream")
async def open_admin_content_stream(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> StreamingResponse:
    hub = get_admin_content_sse_hub()
    subscriber = hub.subscribe(user.organization_id)

    content_id, title = get_now_playing_for_org(session, user.organization_id)
    replay = hub.build_now_playing_replay_envelope(content_id=content_id, title=title)
    subscriber.events.put(replay)

    async def event_generator() -> AsyncIterator[str]:
        disconnected = asyncio.Event()

        async def watch_disconnect() -> None:
            while not await request.is_disconnected():
                await asyncio.sleep(STREAM_QUEUE_POLL_SECONDS)
            disconnected.set()

        watcher = asyncio.create_task(watch_disconnect())
        last_ping_at = time.monotonic()
        try:
            while not disconnected.is_set():
                try:
                    envelope = await asyncio.to_thread(
                        subscriber.events.get,
                        True,
                        STREAM_QUEUE_POLL_SECONDS,
                    )
                except queue.Empty:
                    envelope = None

                if disconnected.is_set():
                    break

                if envelope is not None:
                    yield _format_sse_event(envelope)
                    last_ping_at = time.monotonic()
                    continue

                if time.monotonic() - last_ping_at < PING_INTERVAL_SECONDS:
                    continue

                yield hub.build_ping_comment()
                last_ping_at = time.monotonic()
        except asyncio.CancelledError:
            pass
        finally:
            watcher.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await watcher
            hub.unsubscribe(subscriber.connection_id)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
