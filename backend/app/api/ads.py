from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.mappers import to_ad_schema
from app.api.schemas import AdItemRequest, AdItemSchema, ReorderRequest
from app.auth.dependencies import CurrentUser, require_roles
from app.domain.roles import AD_MANAGEMENT_ROLES
from app.repositories.session import get_session
from app.services.ads_service import AdsService
from app.shared.errors.application_errors import ApplicationError

router = APIRouter(prefix="/ads", tags=["Ads"])


@router.get("", response_model=list[AdItemSchema])
def list_ads(user: CurrentUser = Depends(require_roles(AD_MANAGEMENT_ROLES)), session: Session = Depends(get_session)) -> list[AdItemSchema]:
    return [to_ad_schema(ad) for ad in AdsService(session).list_ads(user.organization_id)]


@router.post("", response_model=AdItemSchema, status_code=status.HTTP_201_CREATED)
def create_ad(
    payload: AdItemRequest,
    user: CurrentUser = Depends(require_roles(AD_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session)
) -> AdItemSchema:
    try:
        return to_ad_schema(AdsService(session).create_ad(user.organization_id, user.id, payload))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/upload", response_model=AdItemSchema, status_code=status.HTTP_201_CREATED)
def upload_ad(
    file: UploadFile = File(...),
    advertiser: str | None = Form(default=None, max_length=120),
    is_active: bool = Form(..., alias="isActive"),
    display_order: int | None = Form(default=None, alias="displayOrder"),
    duration_seconds: int | None = Form(default=None, alias="durationSeconds"),
    rotation_animation: str | None = Form(default=None, alias="rotationAnimation"),
    animation_duration_milliseconds: int | None = Form(default=None, alias="animationDurationMilliseconds"),
    available_from: datetime | None = Form(default=None, alias="availableFrom"),
    available_until: datetime | None = Form(default=None, alias="availableUntil"),
    user: CurrentUser = Depends(require_roles(AD_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session)
) -> AdItemSchema:
    payload = AdItemRequest(
        sourceReference="",
        isActive=is_active,
        displayOrder=display_order,
        durationSeconds=duration_seconds,
        rotationAnimation=rotation_animation,
        animationDurationMilliseconds=animation_duration_milliseconds,
        availableFrom=available_from,
        availableUntil=available_until,
        advertiser=advertiser
    )
    try:
        return to_ad_schema(AdsService(session).create_uploaded_ad(user.organization_id, user.id, file, payload))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{ad_id}", response_model=AdItemSchema)
def get_ad(ad_id: str, user: CurrentUser = Depends(require_roles(AD_MANAGEMENT_ROLES)), session: Session = Depends(get_session)) -> AdItemSchema:
    try:
        return to_ad_schema(AdsService(session).get_ad(user.organization_id, ad_id))
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.put("/{ad_id}", response_model=AdItemSchema)
def update_ad(
    ad_id: str,
    payload: AdItemRequest,
    user: CurrentUser = Depends(require_roles(AD_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session)
) -> AdItemSchema:
    try:
        return to_ad_schema(AdsService(session).update_ad(user.organization_id, user.id, ad_id, payload))
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/{ad_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ad(ad_id: str, user: CurrentUser = Depends(require_roles(AD_MANAGEMENT_ROLES)), session: Session = Depends(get_session)) -> None:
    try:
        AdsService(session).delete_ad(user.organization_id, user.id, ad_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_ads(
    payload: ReorderRequest,
    user: CurrentUser = Depends(require_roles(AD_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session)
) -> None:
    """Reorder the organization's ads.

    The body is a single ``orderedIds`` list. The server renumbers
    ``display_order`` per the list (first id = 1, second = 2, ...).
    A 409 is returned when the list does not match the current set
    of ad ids for the organization.
    """
    try:
        AdsService(session).reorder(user.organization_id, user.id, payload.ordered_ids)
    except ApplicationError:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
