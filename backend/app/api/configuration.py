from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.mappers import to_configuration_schema
from app.api.schemas import KioskConfigurationRequest, KioskConfigurationSchema
from app.application.display_control.service import DisplayControlService
from app.application.display_orchestrator.config_mutation import diff_configuration_fields
from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.sse_hub import get_display_sse_hub
from app.auth.dependencies import CurrentUser, get_current_user, require_roles
from app.domain.roles import CONFIGURATION_MANAGEMENT_ROLES
from app.repositories.session import get_session
from app.services.admin_service import AdminService

router = APIRouter(prefix="/display/configuration", tags=["Display"])


@router.get("", response_model=KioskConfigurationSchema)
def get_configuration(user: CurrentUser = Depends(get_current_user), session: Session = Depends(get_session)) -> KioskConfigurationSchema:
    return to_configuration_schema(AdminService(session).get_configuration(user.organization_id))


@router.put("", response_model=KioskConfigurationSchema)
def update_configuration(
    payload: KioskConfigurationRequest,
    user: CurrentUser = Depends(require_roles(CONFIGURATION_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session)
) -> KioskConfigurationSchema:
    try:
        before_schema = to_configuration_schema(
            AdminService(session).get_configuration(user.organization_id)
        )
        configuration = AdminService(session).update_configuration(
            user.organization_id, user.id, payload, user.roles
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    after_schema = to_configuration_schema(configuration)
    active_session = DisplayControlService(session).latest_active_session(user.organization_id)
    if active_session is not None:
        changed_fields = diff_configuration_fields(before_schema, after_schema)
        get_display_sse_hub().publish_config_updated(
            organization_id=user.organization_id,
            operator_session_id=active_session.id,
            before=before_schema,
            after=after_schema,
        )
        orchestrator = OrchestratorRegistry.get(user.organization_id, active_session.id)
        if orchestrator is not None:
            orchestrator.apply_config_deferred_fields(
                changed_fields,
                after_schema.model_dump(mode="json", by_alias=True),
            )
    return after_schema
