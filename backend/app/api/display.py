from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.api.mappers import (
    to_ad_schema,
    to_configuration_schema,
    to_content_schema,
    to_fixed_eligible_content_schema,
    to_iframe_schema,
)
from app.api.schemas import (
    DisplayStateSchema,
    FixedEligibleContentItemSchema,
    RemoteControlAdminStateSchema,
    RemoteControlIframeOptionsSchema,
    RemoteControlNavigationRequest,
    RemoteControlStateRequest,
    RemoteControlStateSchema,
    RotationEventRequest,
)
from app.auth.dependencies import CurrentUser, get_current_user
from app.domain.roles import REMOTE_CONTROL_ROLES
from app.domain.display_events import create_display_event
from app.repositories.events import DisplayEventRepository
from app.repositories.session import get_session
from app.services.display_service import DisplayState, get_display_state, open_display
from app.services.content_service import ContentService, NoveltyAlreadyConsumedError
from app.domain.rotation import resolve_effective_rotation
from app.application.display_control.service import DisplayControlService
from app.repositories.models.display_control_state import DisplayControlState
from app.repositories.models.iframe import Iframe
from app.shared.errors.application_errors import (
    ConflictApplicationError,
    NotFoundApplicationError,
    PermissionApplicationError,
    ValidationApplicationError,
)

router = APIRouter(prefix="/display", tags=["Display"])


def ensure_remote_control_admin(user: CurrentUser, session: Session) -> None:
    if not set(user.roles).intersection({role.value for role in REMOTE_CONTROL_ROLES}):
        DisplayEventRepository(session).record(
            create_display_event(
                organization_id=user.organization_id,
                event_type="remote_control_access_denied",
                severity="warning",
                message="Remote control access denied",
                created_by_user_id=user.id,
            )
        )
        session.commit()
        raise PermissionApplicationError("remote_control_role_required", "Remote control role required.")


def to_remote_control_schema(state: DisplayControlState | None) -> RemoteControlStateSchema | None:
    if state is None:
        return None
    return RemoteControlStateSchema(
        contentMode=state.content_mode,
        selectedIframeId=state.selected_iframe_id,
        selectedFixedContentId=state.selected_fixed_content_id,
        adsVisible=state.ads_visible,
        fullscreenRequested=state.fullscreen_requested,
        navigationCommand=state.navigation_command,
        navigationCommandId=state.navigation_command_id,
        jumpToContentId=state.jump_to_content_id,
        updatedAt=state.updated_at,
    )


def to_remote_control_admin_schema(
    state: DisplayControlState,
    selected_iframe: Iframe | None = None,
) -> RemoteControlAdminStateSchema:
    return RemoteControlAdminStateSchema(
        contentMode=state.content_mode,
        selectedIframeId=state.selected_iframe_id,
        selectedFixedContentId=state.selected_fixed_content_id,
        selectedIframe=to_iframe_schema(selected_iframe) if selected_iframe else None,
        adsVisible=state.ads_visible,
        navigationCommand=state.navigation_command,
        navigationCommandId=state.navigation_command_id,
        jumpToContentId=state.jump_to_content_id,
        updatedAt=state.updated_at,
        displaySessionActive=True,
    )


def to_display_state_schema(state: DisplayState) -> DisplayStateSchema:
    return DisplayStateSchema(
        configuration=to_configuration_schema(state.configuration),
        topContent=[
            to_content_schema(
                item,
                effective_duration_seconds=resolve_effective_rotation(
                    item.duration_seconds,
                    item.rotation_animation,
                    item.animation_duration_milliseconds,
                    state.configuration.default_top_duration_seconds,
                    state.configuration.default_top_rotation_animation,
                    state.configuration.default_top_animation_duration_milliseconds
                ).duration_seconds,
                effective_rotation_animation=resolve_effective_rotation(
                    item.duration_seconds,
                    item.rotation_animation,
                    item.animation_duration_milliseconds,
                    state.configuration.default_top_duration_seconds,
                    state.configuration.default_top_rotation_animation,
                    state.configuration.default_top_animation_duration_milliseconds
                ).rotation_animation,
                effective_animation_duration_milliseconds=resolve_effective_rotation(
                    item.duration_seconds,
                    item.rotation_animation,
                    item.animation_duration_milliseconds,
                    state.configuration.default_top_duration_seconds,
                    state.configuration.default_top_rotation_animation,
                    state.configuration.default_top_animation_duration_milliseconds
                ).animation_duration_milliseconds
            )
            for item in state.top_content
        ],
        ads=[
            to_ad_schema(
                item,
                effective_duration_seconds=resolve_effective_rotation(
                    item.duration_seconds,
                    item.rotation_animation,
                    item.animation_duration_milliseconds,
                    state.configuration.default_ad_duration_seconds,
                    state.configuration.default_ad_rotation_animation,
                    state.configuration.default_ad_animation_duration_milliseconds
                ).duration_seconds,
                effective_rotation_animation=resolve_effective_rotation(
                    item.duration_seconds,
                    item.rotation_animation,
                    item.animation_duration_milliseconds,
                    state.configuration.default_ad_duration_seconds,
                    state.configuration.default_ad_rotation_animation,
                    state.configuration.default_ad_animation_duration_milliseconds
                ).rotation_animation,
                effective_animation_duration_milliseconds=resolve_effective_rotation(
                    item.duration_seconds,
                    item.rotation_animation,
                    item.animation_duration_milliseconds,
                    state.configuration.default_ad_duration_seconds,
                    state.configuration.default_ad_rotation_animation,
                    state.configuration.default_ad_animation_duration_milliseconds
                ).animation_duration_milliseconds
            )
            for item in state.ads
        ],
        remoteControl=to_remote_control_schema(state.remote_control),
        selectedIframe=to_iframe_schema(state.selected_iframe) if state.selected_iframe else None,
        fallbackActive=state.fallback_active,
        fixedEligibleContents=[
            to_fixed_eligible_content_schema(item)
            for item in (state.fixed_eligible_contents or [])
        ],
    )


@router.post("/open", response_model=DisplayStateSchema)
def open_display_route(user: CurrentUser = Depends(get_current_user), session: Session = Depends(get_session)) -> DisplayStateSchema:
    try:
        state = open_display(session, user.organization_id, user.id, user.roles)
    except PermissionError as exc:
        raise PermissionApplicationError("display_open_forbidden", str(exc)) from exc
    except ValueError as exc:
        raise ConflictApplicationError("display_not_ready", str(exc)) from exc
    return to_display_state_schema(state)


@router.get("/state", response_model=DisplayStateSchema)
def display_state_route(user: CurrentUser = Depends(get_current_user), session: Session = Depends(get_session)) -> DisplayStateSchema:
    try:
        return to_display_state_schema(get_display_state(session, user.organization_id))
    except ValueError as exc:
        raise ConflictApplicationError("display_state_unavailable", str(exc)) from exc


@router.get("/remote-control/state", response_model=RemoteControlAdminStateSchema)
def remote_control_state_route(
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> RemoteControlAdminStateSchema:
    ensure_remote_control_admin(user, session)
    try:
        service = DisplayControlService(session)
        state = service.read_state_for_active_session(user.organization_id)
        if state is None:
            raise LookupError("No active display session.")
        return to_remote_control_admin_schema(state, service.selected_iframe(state))
    except LookupError as exc:
        raise ConflictApplicationError("no_active_display_session", str(exc)) from exc


@router.put("/remote-control/state", response_model=RemoteControlAdminStateSchema)
def update_remote_control_state_route(
    payload: RemoteControlStateRequest,
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> RemoteControlAdminStateSchema:
    ensure_remote_control_admin(user, session)
    try:
        service = DisplayControlService(session)
        state = service.update_active_state(
            user.organization_id,
            user.id,
            content_mode=payload.content_mode,
            selected_iframe_id=str(payload.selected_iframe_id) if payload.selected_iframe_id else None,
            ads_visible=payload.ads_visible,
            fullscreen_requested=payload.fullscreen_requested,
            selected_fixed_content_id=str(payload.selected_fixed_content_id)
            if payload.selected_fixed_content_id
            else None,
        )
        return to_remote_control_admin_schema(state, service.selected_iframe(state))
    except LookupError as exc:
        raise ConflictApplicationError("no_active_display_session", str(exc)) from exc
    except ValueError as exc:
        raise ValidationApplicationError("remote_control_invalid", str(exc)) from exc


@router.post("/remote-control/navigation", response_model=RemoteControlAdminStateSchema)
def remote_control_navigation_route(
    payload: RemoteControlNavigationRequest,
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> RemoteControlAdminStateSchema:
    ensure_remote_control_admin(user, session)
    try:
        service = DisplayControlService(session)
        state = service.issue_navigation_command(
            user.organization_id,
            user.id,
            command=payload.command,
            target_content_id=str(payload.target_content_id) if payload.target_content_id else None,
        )
        return to_remote_control_admin_schema(state, service.selected_iframe(state))
    except LookupError as exc:
        raise ConflictApplicationError("no_active_display_session", str(exc)) from exc
    except ValueError as exc:
        raise ValidationApplicationError("remote_control_invalid", str(exc)) from exc


@router.get("/remote-control/iframe-options", response_model=RemoteControlIframeOptionsSchema)
def remote_control_iframe_options_route(
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> RemoteControlIframeOptionsSchema:
    ensure_remote_control_admin(user, session)
    service = DisplayControlService(session)
    items = service.list_iframe_options(user.organization_id)
    fixed_items = service.list_fixed_eligible_contents(user.organization_id)
    return RemoteControlIframeOptionsSchema(
        items=[to_iframe_schema(item) for item in items],
        fixedEligibleContents=[to_fixed_eligible_content_schema(item) for item in fixed_items],
    )


@router.post("/rotation-event", status_code=status.HTTP_202_ACCEPTED)
def rotation_event_route(
    payload: RotationEventRequest,
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> dict[str, str]:
    """Kiosk-initiated rotation events (contracts/audit-display-control.md §6).

    Only the kiosk runs in an authenticated session tied to an operator session; we
    accept the same auth model as the rest of the display endpoints.
    """
    try:
        DisplayControlService(session).record_rotation_event(
            organization_id=user.organization_id,
            event_type=payload.event_type,
            payload=payload.payload,
            user_id=user.id,
        )
    except ValueError as exc:
        raise ValidationApplicationError("rotation_event_invalid", str(exc)) from exc
    return {"status": "accepted"}


@router.post("/content/{content_id}/consume-novelty", status_code=status.HTTP_204_NO_CONTENT)
def consume_novelty_route(
    content_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """Claim a pending novelty item for display on this kiosk (CHG-027).

    Uses a conditional update so only the first kiosk to consume a given novelty
    succeeds; others receive 409.
    """
    service = ContentService(session)
    try:
        service.consume_novelty(user.organization_id, str(content_id))
    except LookupError as exc:
        raise NotFoundApplicationError("content_not_found", str(exc)) from exc
    except NoveltyAlreadyConsumedError as exc:
        raise ConflictApplicationError("novelty_already_consumed", "Novelty already consumed.") from exc
