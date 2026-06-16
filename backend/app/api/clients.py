from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.mappers import to_client_schema
from app.api.schemas import ClientRequest, ClientSchema
from app.auth.dependencies import CurrentUser, require_roles
from app.domain.roles import AD_MANAGEMENT_ROLES
from app.repositories.session import get_session
from app.services.ads_service import AdsService

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("", response_model=list[ClientSchema])
def list_clients(user: CurrentUser = Depends(require_roles(AD_MANAGEMENT_ROLES)), session: Session = Depends(get_session)) -> list[ClientSchema]:
    return [to_client_schema(client) for client in AdsService(session).list_clients(user.organization_id)]


@router.post("", response_model=ClientSchema, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientRequest,
    user: CurrentUser = Depends(require_roles(AD_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session)
) -> ClientSchema:
    return to_client_schema(AdsService(session).create_client(user.organization_id, user.id, payload))
