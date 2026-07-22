from __future__ import annotations

from decimal import Decimal
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.schemas import DisplayScaleEntry, DisplayScaleOverrideInput, IframeRequest
from app.application.display_orchestrator.sse_hub import get_display_sse_hub
from app.application.iframe_runtime import emit_iframe_scale_updated, refresh_active_iframe_display
from app.application.iframe_scale_resolver import resolve_effective_scale
from app.domain.display_events import create_display_event
from app.repositories.display_devices import DisplayDeviceRepository
from app.repositories.events import DisplayEventRepository
from app.repositories.iframe_display_scale_overrides import IframeDisplayScaleOverrideRepository
from app.repositories.models.display_control_state import DisplayControlState
from app.repositories.models.iframe import Iframe, MAX_IFRAME_SCALE, MIN_IFRAME_SCALE


class IframeService:
    def __init__(self, session: Session):
        self.session = session
        self.devices = DisplayDeviceRepository(session)
        self.overrides = IframeDisplayScaleOverrideRepository(session)

    def list(self, organization_id: str) -> list[Iframe]:
        return list(
            self.session.scalars(
                select(Iframe)
                .where(Iframe.organization_id == organization_id)
                .order_by(Iframe.created_at.asc())
            )
        )

    def get(self, organization_id: str, iframe_id: str) -> Iframe:
        iframe = self.session.scalar(
            select(Iframe).where(Iframe.organization_id == organization_id, Iframe.id == iframe_id)
        )
        if iframe is None:
            raise LookupError("Iframe not found.")
        return iframe

    def create(self, organization_id: str, request: IframeRequest, current_user: str) -> Iframe:
        url = self._clean_url(request.url)
        self._ensure_unique(organization_id, url)
        iframe = Iframe(
            organization_id=organization_id,
            url=url,
            scale_x=self._validated_scale(request.scale_x),
            scale_y=self._validated_scale(request.scale_y),
            created_by_user_id=current_user,
            updated_by_user_id=current_user,
        )
        self.session.add(iframe)
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise ValueError("An iframe with this URL already exists.") from exc
        return iframe

    def update(self, organization_id: str, iframe_id: str, request: IframeRequest, current_user: str) -> Iframe:
        iframe = self.get(organization_id, iframe_id)
        url = self._clean_url(request.url)
        self._ensure_unique(organization_id, url, exclude_id=iframe_id)
        iframe.url = url
        iframe.scale_x = self._validated_scale(request.scale_x)
        iframe.scale_y = self._validated_scale(request.scale_y)
        iframe.updated_by_user_id = current_user
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise ValueError("An iframe with this URL already exists.") from exc
        refresh_active_iframe_display(self.session, organization_id, iframe_id)
        return iframe

    def delete(self, organization_id: str, iframe_id: str, current_user: str) -> None:
        iframe = self.get(organization_id, iframe_id)
        states = list(
            self.session.scalars(
                select(DisplayControlState).where(
                    DisplayControlState.organization_id == organization_id,
                    DisplayControlState.selected_iframe_id == iframe_id,
                )
            )
        )
        for state in states:
            state.content_mode = "loop"
            state.selected_iframe_id = None
            state.updated_by_user_id = current_user
            DisplayEventRepository(self.session).record(
                create_display_event(
                    organization_id=organization_id,
                    event_type="remote_control_iframe_deleted",
                    severity="info",
                    message="Selected iframe was deleted; display returned to rotation.",
                    entity_type="iframe",
                    entity_id=iframe_id,
                    metadata={
                        "iframeId": iframe_id,
                        "displaySessionId": state.display_session_id,
                        "userId": current_user,
                    },
                    created_by_user_id=current_user,
                )
            )
        self.session.delete(iframe)
        self.session.commit()

    def list_display_scales(self, organization_id: str, iframe_id: str) -> list[DisplayScaleEntry]:
        iframe = self.get(organization_id, iframe_id)
        connected_labels = {
            (registration.label or "").strip()
            for registration in get_display_sse_hub().list_registrations(organization_id)
            if registration.label
        }
        override_map = {
            row.display_device_id: row for row in self.overrides.list_for_iframe(iframe.id)
        }
        entries: list[DisplayScaleEntry] = []
        for device in self.devices.list_for_organization(organization_id):
            override = override_map.get(device.id)
            effective = resolve_effective_scale(iframe, override)
            entries.append(
                DisplayScaleEntry(
                    displayDeviceId=device.id,
                    displayLabel=device.label,
                    connected=device.label in connected_labels,
                    scaleX=float(effective.scale_x),
                    scaleY=float(effective.scale_y),
                    source=effective.source,
                )
            )
        return entries

    def batch_save_display_scales(
        self,
        organization_id: str,
        iframe_id: str,
        items: list[DisplayScaleOverrideInput],
        current_user: str,
    ) -> list[DisplayScaleEntry]:
        iframe = self.get(organization_id, iframe_id)
        changed_device_ids: list[str] = []
        for item in items:
            device = self.devices.get(organization_id, str(item.display_device_id))
            if device is None:
                raise LookupError("Display device not found.")
            if item.clear:
                self.overrides.clear(device.id, iframe.id)
                changed_device_ids.append(device.id)
                continue
            if item.scale_x is None or item.scale_y is None:
                raise ValueError("scaleX and scaleY are required when not clearing an override.")
            self.overrides.upsert(
                display_device_id=device.id,
                iframe_id=iframe.id,
                scale_x=self._validated_scale(item.scale_x),
                scale_y=self._validated_scale(item.scale_y),
            )
            changed_device_ids.append(device.id)
        self.session.commit()
        for device_id in changed_device_ids:
            emit_iframe_scale_updated(self.session, organization_id, iframe_id, device_id)
        return self.list_display_scales(organization_id, iframe_id)

    def list_overrides_for_device(self, organization_id: str, display_device_id: str) -> dict[str, dict[str, float]]:
        device = self.devices.get(organization_id, display_device_id)
        if device is None:
            raise LookupError("Display device not found.")
        result: dict[str, dict[str, float]] = {}
        for row in self.overrides.list_for_device(device.id):
            result[row.iframe_id] = {"scaleX": float(row.scale_x), "scaleY": float(row.scale_y)}
        return result

    def _clean_url(self, url: str) -> str:
        """Return the URL unchanged except for leading/trailing whitespace."""
        clean = (url or "").strip()
        parsed = urlparse(clean)
        if not clean or parsed.scheme not in {"http", "https"} or not parsed.netloc or any(ch.isspace() for ch in clean):
            raise ValueError("URL is not a valid http(s) URL.")
        if len(clean) > 1024:
            raise ValueError("URL is too long.")
        return clean

    def _ensure_unique(self, organization_id: str, url: str, exclude_id: str | None = None) -> None:
        query = select(Iframe).where(Iframe.organization_id == organization_id, Iframe.url == url)
        if exclude_id is not None:
            query = query.where(Iframe.id != exclude_id)
        if self.session.scalar(query) is not None:
            raise ValueError("An iframe with this URL already exists.")

    def _validated_scale(self, value: float) -> Decimal:
        scale = Decimal(str(value)).quantize(Decimal("0.01"))
        if scale < MIN_IFRAME_SCALE or scale > MAX_IFRAME_SCALE:
            raise ValueError("Scale must be between 0.1 and 5.0.")
        return scale
