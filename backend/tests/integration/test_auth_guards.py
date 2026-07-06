from dataclasses import dataclass

import pytest

from app.auth.dependencies import require_roles
from app.domain.roles import Role
from app.shared.errors.application_errors import InvalidRoleError, PermissionApplicationError


@dataclass
class CurrentUser:
    roles: list[str]


def test_role_guard_allows_matching_role():
    dependency = require_roles({Role.ADMINISTRATOR})

    assert dependency(CurrentUser(["administrator"])).roles == ["administrator"]


def test_role_guard_rejects_missing_role():
    dependency = require_roles({Role.ADMINISTRATOR})

    with pytest.raises(PermissionApplicationError) as exc:
        dependency(CurrentUser(["event_operator"]))

    assert exc.value.status_code == 403


def test_role_guard_rejects_invalid_role():
    dependency = require_roles({Role.ADMINISTRATOR})

    with pytest.raises(InvalidRoleError):
        dependency(CurrentUser(["not_a_real_role"]))

