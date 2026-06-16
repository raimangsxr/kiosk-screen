from dataclasses import dataclass

import pytest
from fastapi import HTTPException

from app.auth.dependencies import require_roles
from app.domain.roles import Role


@dataclass
class CurrentUser:
    roles: list[str]


def test_role_guard_allows_matching_role():
    dependency = require_roles({Role.ADMINISTRATOR})

    assert dependency(CurrentUser(["administrator"])).roles == ["administrator"]


def test_role_guard_rejects_missing_role():
    dependency = require_roles({Role.ADMINISTRATOR})

    with pytest.raises(HTTPException) as exc:
        dependency(CurrentUser(["event_operator"]))

    assert exc.value.status_code == 403

