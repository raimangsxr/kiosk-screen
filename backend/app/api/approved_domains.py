from fastapi import APIRouter, Depends, HTTPException, status
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


@router.put("/{domain_id}", response_model=ApprovedEmbeddedDomainSchema)
def update_domain(
    domain_id: str,
    payload: ApprovedEmbeddedDomainRequest,
    user: CurrentUser = Depends(require_roles(ADMIN_ROLES)),
    session: Session = Depends(get_session)
) -> ApprovedEmbeddedDomainSchema:
    try:
        return to_domain_schema(AdminService(session).update_domain(user.organization_id, user.id, domain_id, payload))
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/{domain_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_domain(
    domain_id: str,
    user: CurrentUser = Depends(require_roles(ADMIN_ROLES)),
    session: Session = Depends(get_session)
) -> None:
    try:
        AdminService(session).delete_domain(user.organization_id, user.id, domain_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
