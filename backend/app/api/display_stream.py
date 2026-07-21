from __future__ import annotations

import json
import queue
import time
from typing import Any, Iterator, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import Field
from sqlalchemy.orm import Session

from app.api.schemas import CamelModel, LiveKioskSchema
from app.application.display_control.service import DisplayControlService
from app.application.display_orchestrator.hooks import ensure_display_orchestrator
from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.snapshot_builder import build_snapshot_payload
from app.application.display_orchestrator.sse_hub import PING_INTERVAL_SECONDS, get_display_sse_hub
from app.application.iframe_runtime import list_live_kiosks
from app.auth.dependencies import CurrentUser, get_current_user, require_roles
from app.domain.roles import OPERATIONS_READ_ROLES
from app.repositories.session import get_session

router = APIRouter(prefix="/display", tags=["Display Stream"])
admin_router = APIRouter(prefix="/admin/display", tags=["Display Admin"])


class KioskRegisterRequest(CamelModel):
    client_instance_id: str = Field(min_length=1, max_length=64, alias="clientInstanceId")
    label: str | None = Field(default=None, max_length=80)


class KioskRegisterResponse(CamelModel):
    kiosk_id: UUID = Field(alias="kioskId")
    organization_id: UUID = Field(alias="organizationId")
    operator_session_id: UUID = Field(alias="operatorSessionId")
    protocol_version: int = Field(default=1, alias="protocolVersion")


class KioskEventRequest(CamelModel):
    kiosk_id: UUID = Field(alias="kioskId")
    type: Literal["video_ended", "media_error"]
    command_id: str = Field(min_length=1, alias="commandId")
    content_id: UUID | None = Field(default=None, alias="contentId")
    at: str | None = None
    metadata: dict[str, Any] | None = None


def _format_sse_event(envelope: dict) -> str:
    sequence = envelope.get("sequence", 0)
    event_type = envelope.get("type", "message")
    data = json.dumps(envelope, separators=(",", ":"))
    return f"id: {sequence}\nevent: {event_type}\ndata: {data}\n\n"


def _require_active_session(session: Session, organization_id: str):
    operator_session = DisplayControlService(session).latest_active_session(organization_id)
    if operator_session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="no_active_session")
    return operator_session


@admin_router.get("/kiosks/live", response_model=list[LiveKioskSchema])
def list_live_kiosks_endpoint(
    user: CurrentUser = Depends(require_roles(OPERATIONS_READ_ROLES)),
) -> list[LiveKioskSchema]:
    return [LiveKioskSchema.model_validate(row) for row in list_live_kiosks(user.organization_id)]


@router.post("/kiosk/register", response_model=KioskRegisterResponse, status_code=status.HTTP_201_CREATED)
def register_kiosk(
    payload: KioskRegisterRequest,
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> KioskRegisterResponse:
    operator_session = _require_active_session(session, user.organization_id)
    registration = get_display_sse_hub().register_kiosk(
        organization_id=user.organization_id,
        operator_session_id=operator_session.id,
        client_instance_id=payload.client_instance_id,
        label=payload.label,
    )
    get_display_sse_hub().record_kiosk_connected(session, registration)
    session.commit()
    ensure_display_orchestrator(session, user.organization_id)
    return KioskRegisterResponse(
        kiosk_id=registration.kiosk_id,
        organization_id=registration.organization_id,
        operator_session_id=registration.operator_session_id,
    )


@router.post("/kiosk/events", status_code=status.HTTP_204_NO_CONTENT)
def post_kiosk_event(
    payload: KioskEventRequest,
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    registration = get_display_sse_hub().get_kiosk(str(payload.kiosk_id))
    if registration is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="kiosk_not_found")
    if registration.organization_id != user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")

    orchestrator = OrchestratorRegistry.get(
        registration.organization_id,
        registration.operator_session_id,
    )
    if orchestrator is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="orchestrator_not_active")

    if payload.type == "video_ended":
        orchestrator.handle_video_ended(session, command_id=payload.command_id)
        return

    orchestrator.handle_media_error(
        session,
        command_id=payload.command_id,
        content_id=str(payload.content_id) if payload.content_id is not None else None,
        metadata=payload.metadata,
    )


@router.get("/stream")
def open_display_stream(
    kiosk_id: UUID = Query(alias="kioskId"),
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
    last_event_id: int | None = Header(default=None, alias="Last-Event-ID"),
) -> StreamingResponse:
    registration = get_display_sse_hub().get_kiosk(str(kiosk_id))
    if registration is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="kiosk_not_found")
    if registration.organization_id != user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")

    hub = get_display_sse_hub()
    subscriber = hub.subscribe(registration)
    hub.record_kiosk_connected(session, registration)
    orchestrator = OrchestratorRegistry.get(
        registration.organization_id,
        registration.operator_session_id,
    )
    snapshot_payload = build_snapshot_payload(
        session,
        user.organization_id,
        orchestrator=orchestrator,
    )
    initial_events = hub.replay_or_snapshot(
        organization_id=registration.organization_id,
        operator_session_id=registration.operator_session_id,
        last_event_id=last_event_id,
        snapshot_payload=snapshot_payload,
    )

    def event_generator() -> Iterator[str]:
        try:
            for envelope in initial_events:
                yield _format_sse_event(envelope)
            while True:
                try:
                    envelope = subscriber.events.get(timeout=PING_INTERVAL_SECONDS)
                    yield _format_sse_event(envelope)
                except queue.Empty:
                    ping = hub.publish(
                        organization_id=registration.organization_id,
                        operator_session_id=registration.operator_session_id,
                        event_type="ping",
                        payload={"serverTime": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())},
                    )
                    yield _format_sse_event(ping)
        finally:
            hub.unsubscribe(subscriber.connection_id)
            hub.record_kiosk_disconnected(session, registration)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
