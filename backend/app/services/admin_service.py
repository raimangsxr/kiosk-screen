from sqlalchemy.orm import Session

from app.api.schemas import ApprovedEmbeddedDomainRequest, KioskConfigurationRequest, UserRequest
from app.auth.service import hash_password
from app.domain.display_events import create_display_event
from app.domain.media import validate_rotation_animation
from app.domain.roles import Role
from app.repositories.events import DisplayEventRepository
from app.repositories.models.approved_domain import ApprovedEmbeddedDomain
from app.repositories.models.content import TopContentItem
from app.repositories.models.kiosk_configuration import KioskDisplayConfiguration
from app.repositories.models.role_assignment import RoleAssignment
from app.repositories.models.user import User


class AdminService:
    def __init__(self, session: Session):
        self.session = session

    def get_configuration(self, organization_id: str) -> KioskDisplayConfiguration:
        configuration = self.session.query(KioskDisplayConfiguration).filter_by(organization_id=organization_id).first()
        if configuration is None:
            raise LookupError("Display configuration not found.")
        return configuration

    def update_configuration(
        self,
        organization_id: str,
        user_id: str,
        payload: KioskConfigurationRequest,
        user_roles: list[str] | None = None
    ) -> KioskDisplayConfiguration:
        validate_rotation_animation(payload.default_top_rotation_animation)
        validate_rotation_animation(payload.default_ad_rotation_animation)
        configuration = self.get_configuration(organization_id)
        roles = {Role(role) for role in (user_roles or [])}
        if Role.ADMINISTRATOR not in roles:
            if Role.CONTENT_MANAGER in roles and (
                payload.default_ad_duration_seconds != configuration.default_ad_duration_seconds
                or payload.default_ad_rotation_animation != configuration.default_ad_rotation_animation
                or payload.default_ad_animation_duration_milliseconds != configuration.default_ad_animation_duration_milliseconds
                or payload.inline_ad_count != configuration.inline_ad_count
            ):
                raise PermissionError("Content managers cannot change ad configuration.")
            if Role.ADVERTISING_MANAGER in roles and (
                payload.default_top_duration_seconds != configuration.default_top_duration_seconds
                or payload.default_top_rotation_animation != configuration.default_top_rotation_animation
                or payload.default_top_animation_duration_milliseconds != configuration.default_top_animation_duration_milliseconds
            ):
                raise PermissionError("Advertising managers cannot change main content configuration.")
        configuration.name = payload.name
        configuration.default_top_duration_seconds = payload.default_top_duration_seconds
        configuration.default_ad_duration_seconds = payload.default_ad_duration_seconds
        configuration.default_top_rotation_animation = payload.default_top_rotation_animation
        configuration.default_ad_rotation_animation = payload.default_ad_rotation_animation
        configuration.default_top_animation_duration_milliseconds = payload.default_top_animation_duration_milliseconds
        configuration.default_ad_animation_duration_milliseconds = payload.default_ad_animation_duration_milliseconds
        configuration.inline_ad_count = payload.inline_ad_count
        configuration.configured_event_duration_minutes = payload.configured_event_duration_minutes
        configuration.is_enabled = payload.is_enabled
        self._record(organization_id, user_id, "configuration_changed", "Display configuration changed")
        self.session.commit()
        return configuration

    def list_domains(self, organization_id: str) -> list[ApprovedEmbeddedDomain]:
        return list(self.session.query(ApprovedEmbeddedDomain).filter_by(organization_id=organization_id).order_by(ApprovedEmbeddedDomain.domain))

    def create_domain(self, organization_id: str, user_id: str, payload: ApprovedEmbeddedDomainRequest) -> ApprovedEmbeddedDomain:
        domain = ApprovedEmbeddedDomain(
            organization_id=organization_id,
            domain=payload.domain.lower(),
            is_active=payload.is_active,
            approved_by_user_id=user_id
        )
        self.session.add(domain)
        self._record(organization_id, user_id, "domain_changed", "Approved domain changed")
        self.session.commit()
        return domain

    def update_domain(self, organization_id: str, user_id: str, domain_id: str, payload: ApprovedEmbeddedDomainRequest) -> ApprovedEmbeddedDomain:
        domain = self.session.query(ApprovedEmbeddedDomain).filter_by(organization_id=organization_id, id=domain_id).one_or_none()
        if domain is None:
            raise LookupError("Approved domain not found.")
        domain.domain = payload.domain.lower()
        domain.is_active = payload.is_active
        domain.approved_by_user_id = user_id
        self._record(organization_id, user_id, "domain_changed", "Approved domain changed")
        self.session.commit()
        return domain

    def delete_domain(self, organization_id: str, user_id: str, domain_id: str) -> None:
        domain = self.session.query(ApprovedEmbeddedDomain).filter_by(organization_id=organization_id, id=domain_id).one_or_none()
        if domain is None:
            raise LookupError("Approved domain not found.")
        active_count = self.session.query(TopContentItem).filter_by(
            organization_id=organization_id,
            approved_domain_id=domain_id,
            is_active=True
        ).count()
        if active_count:
            raise ValueError("Approved domain has active iframe content. Deactivate the domain instead of deleting it.")
        self.session.delete(domain)
        self._record(organization_id, user_id, "domain_changed", "Approved domain removed")
        self.session.commit()

    def list_users(self, organization_id: str) -> list[tuple[User, list[str]]]:
        users = self.session.query(User).filter_by(organization_id=organization_id).order_by(User.email).all()
        return [(user, self._roles(user.id)) for user in users]

    def create_user(self, organization_id: str, user_id: str, payload: UserRequest) -> tuple[User, list[str]]:
        user = User(
            organization_id=organization_id,
            email=payload.email,
            display_name=payload.display_name,
            password_hash=hash_password("change-me"),
            is_active=payload.is_active
        )
        self.session.add(user)
        self.session.flush()
        self._replace_roles(organization_id, user.id, payload.roles)
        self._record(organization_id, user_id, "user_changed", "User changed")
        self.session.commit()
        return user, self._roles(user.id)

    def update_user(self, organization_id: str, user_id: str, target_user_id: str, payload: UserRequest) -> tuple[User, list[str]]:
        user = self.session.query(User).filter_by(organization_id=organization_id, id=target_user_id).one_or_none()
        if user is None:
            raise LookupError("User not found.")
        user.email = payload.email
        user.display_name = payload.display_name
        user.is_active = payload.is_active
        self._replace_roles(organization_id, user.id, payload.roles)
        self._record(organization_id, user_id, "user_changed", "User changed")
        self.session.commit()
        return user, self._roles(user.id)

    def _roles(self, user_id: str) -> list[str]:
        return [role for (role,) in self.session.query(RoleAssignment.role).filter_by(user_id=user_id).all()]

    def _replace_roles(self, organization_id: str, user_id: str, roles: list[str]) -> None:
        self.session.query(RoleAssignment).filter_by(user_id=user_id).delete()
        for role in roles:
            self.session.add(RoleAssignment(organization_id=organization_id, user_id=user_id, role=role))

    def _record(self, organization_id: str, user_id: str, event_type: str, message: str) -> None:
        DisplayEventRepository(self.session).record(
            create_display_event(organization_id, event_type, "info", message, created_by_user_id=user_id)
        )
