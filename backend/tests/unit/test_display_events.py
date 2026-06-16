from app.domain.display_events import create_display_event


def test_display_event_sanitizes_sensitive_metadata():
    event = create_display_event(
        organization_id="org-1",
        event_type="auth_denied",
        severity="warning",
        message="Denied",
        metadata={"password": "secret", "reason": "role"}
    )

    assert event.metadata == {"reason": "role"}
    assert event.organization_id == "org-1"

