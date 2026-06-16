from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.schemas import AdItemSchema, ContentItemSchema, DisplayStateSchema, KioskConfigurationSchema
from app.auth.dependencies import CurrentUser, get_current_user
from app.repositories.session import get_session
from app.services.display_service import DisplayState, get_display_state, open_display

router = APIRouter(prefix="/display", tags=["Display"])


def to_display_state_schema(state: DisplayState) -> DisplayStateSchema:
    return DisplayStateSchema(
        configuration=KioskConfigurationSchema(
            id=state.configuration.id,
            name=state.configuration.name,
            topRegionRatio=state.configuration.top_region_ratio,
            bottomRegionRatio=state.configuration.bottom_region_ratio,
            defaultTopDurationSeconds=state.configuration.default_top_duration_seconds,
            defaultAdDurationSeconds=state.configuration.default_ad_duration_seconds,
            configuredEventDurationMinutes=state.configuration.configured_event_duration_minutes,
            isEnabled=state.configuration.is_enabled
        ),
        topContent=[
            ContentItemSchema(
                id=item.id,
                title=item.title,
                contentType=item.content_type,
                sourceReference=item.source_reference,
                approvedDomainId=item.approved_domain_id,
                isActive=item.is_active,
                displayOrder=item.display_order,
                durationSeconds=item.duration_seconds,
                availableFrom=item.available_from,
                availableUntil=item.available_until
            )
            for item in state.top_content
        ],
        ads=[
            AdItemSchema(
                id=item.id,
                clientId=item.client_id,
                label=item.label,
                sourceReference=item.source_reference,
                isActive=item.is_active,
                displayOrder=item.display_order,
                durationSeconds=item.duration_seconds,
                availableFrom=item.available_from,
                availableUntil=item.available_until
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

