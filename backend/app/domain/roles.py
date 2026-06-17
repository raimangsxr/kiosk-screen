from enum import StrEnum


class Role(StrEnum):
    DISPLAY_VIEWER = "display_viewer"
    EVENT_OPERATOR = "event_operator"
    CONTENT_MANAGER = "content_manager"
    ADVERTISING_MANAGER = "advertising_manager"
    ADMINISTRATOR = "administrator"


DISPLAY_OPEN_ROLES = {Role.EVENT_OPERATOR, Role.ADMINISTRATOR}
CONTENT_MANAGEMENT_ROLES = {Role.CONTENT_MANAGER, Role.ADMINISTRATOR}
AD_MANAGEMENT_ROLES = {Role.ADVERTISING_MANAGER, Role.ADMINISTRATOR}
ADMIN_ROLES = {Role.ADMINISTRATOR}
CONFIGURATION_MANAGEMENT_ROLES = {Role.ADMINISTRATOR, Role.CONTENT_MANAGER, Role.ADVERTISING_MANAGER}


def normalize_roles(roles: set[str] | list[str] | tuple[str, ...]) -> set[Role]:
    return {Role(role) for role in roles}


def has_any_role(user_roles: set[Role], allowed_roles: set[Role]) -> bool:
    return bool(user_roles.intersection(allowed_roles))


def can_open_display(user_roles: set[Role]) -> bool:
    return has_any_role(user_roles, DISPLAY_OPEN_ROLES)
