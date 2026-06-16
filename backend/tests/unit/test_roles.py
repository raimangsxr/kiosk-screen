from app.domain.roles import Role, can_open_display, has_any_role, normalize_roles


def test_role_policy_allows_operator_to_open_display():
    roles = normalize_roles(["event_operator"])

    assert can_open_display(roles) is True
    assert has_any_role(roles, {Role.ADMINISTRATOR}) is False

