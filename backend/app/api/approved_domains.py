from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.mappers import to_domain_schema
from app.api.schemas import ApprovedEmbeddedDomainRequest, ApprovedEmbeddedDomainSchema
from app.auth.dependencies import CurrentUser, require_roles
from app.domain.roles import ADMIN_ROLES
from app.repositories.session import get_session
from app.services.admin_service import AdminService

router = APIRouter(prefix="/approved-domains", tags=["Approved Domains"])


@router.get("", response_model=list[ApprovedEmbeddedDomainSchema])
def list_domains(user: CurrentUser = Depends(require_roles(ADMIN_ROLES)), session: Session = Depends(get_session)) -> list[ApprovedEmbeddedDomainSchema]:
    return [to_domain_schema(domain) for domain in AdminService(session).list_domains(user.organization_id)]


@router.post("", response_model=ApprovedEmbeddedDomainSchema, status_code=status.HTTP_201_CREATED)
def create_domain(
    payload: ApprovedEmbeddedDomainRequest,
    user: CurrentUser = Depends(require_roles(ADMIN_ROLES)),
    session: Session = Depends(get_session)
) -> ApprovedEmbeddedDomainSchema:
    return to_domain_schema(AdminService(session).create_domain(user.organization_id, user.id, payload))
