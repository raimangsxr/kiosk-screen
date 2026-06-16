from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.mappers import to_ad_schema
from app.api.schemas import AdItemRequest, AdItemSchema
from app.auth.dependencies import CurrentUser, require_roles
from app.domain.roles import AD_MANAGEMENT_ROLES
from app.repositories.session import get_session
from app.services.ads_service import AdsService

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
