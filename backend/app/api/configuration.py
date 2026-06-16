from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.mappers import to_configuration_schema
from app.api.schemas import KioskConfigurationRequest, KioskConfigurationSchema
from app.auth.dependencies import CurrentUser, get_current_user, require_roles
from app.domain.roles import ADMIN_ROLES
from app.repositories.session import get_session
from app.services.admin_service import AdminService

router = APIRouter(prefix="/display/configuration", tags=["Display"])


@router.get("", response_model=KioskConfigurationSchema)
def get_configuration(user: CurrentUser = Depends(get_current_user), session: Session = Depends(get_session)) -> KioskConfigurationSchema:
    return to_configuration_schema(AdminService(session).get_configuration(user.organization_id))


@router.put("", response_model=KioskConfigurationSchema)
def update_configuration(
    payload: KioskConfigurationRequest,
    user: CurrentUser = Depends(require_roles(ADMIN_ROLES)),
    session: Session = Depends(get_session)
) -> KioskConfigurationSchema:
    return to_configuration_schema(AdminService(session).update_configuration(user.organization_id, user.id, payload))
