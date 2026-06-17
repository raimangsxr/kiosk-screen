from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.mappers import to_ad_schema, to_configuration_schema, to_content_schema
from app.api.schemas import DisplayStateSchema
from app.auth.dependencies import CurrentUser, get_current_user
from app.repositories.session import get_session
from app.services.display_service import DisplayState, get_display_state, open_display
from app.domain.rotation import resolve_effective_rotation

router = APIRouter(prefix="/display", tags=["Display"])


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
        fallbackActive=state.fallback_active
    )


@router.post("/open", response_model=DisplayStateSchema)
def open_display_route(user: CurrentUser = Depends(get_current_user), session: Session = Depends(get_session)) -> DisplayStateSchema:
    try:
        state = open_display(session, user.organization_id, user.id, user.roles)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return to_display_state_schema(state)


@router.get("/state", response_model=DisplayStateSchema)
def display_state_route(user: CurrentUser = Depends(get_current_user), session: Session = Depends(get_session)) -> DisplayStateSchema:
    return to_display_state_schema(get_display_state(session, user.organization_id))
