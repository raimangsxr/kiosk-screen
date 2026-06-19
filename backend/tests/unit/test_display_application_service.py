"""Tests for the application-level display facade (T087).

The refactor introduced ``backend/app/application/display/service.py`` as a
re-export layer over ``app.services.display_service``. These tests verify
that the facade exposes the right symbols and that the contracts documented
in ``specs/005-admin-refactor/contracts/backend-contract.md`` for the display
use case continue to hold.
"""

import inspect

from app.application.display import service as facade
from app.services import display_service


def test_application_display_facade_exposes_documented_symbols():
    expected = {
        "DisplayState",
        "eligible_ads",
        "eligible_top_content",
        "get_display_state",
        "open_display",
        "record_fallback_activation",
    }
    assert expected.issubset(set(dir(facade)))


def test_application_display_symbols_resolve_to_real_service():
    for name in (
        "DisplayState",
        "eligible_ads",
        "eligible_top_content",
        "get_display_state",
        "open_display",
        "record_fallback_activation",
    ):
        facade_obj = getattr(facade, name)
        real_obj = getattr(display_service, name)
        assert facade_obj is real_obj, f"{name} must be the same object as in services.display_service"


def test_eligible_filters_drop_inactive_ads(db_session):
    from app.repositories.models.ad import ClientAdItem
    from app.services.bootstrap_service import bootstrap_mvp_data

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.add(
        ClientAdItem(
            organization_id=result.organization.id,
            source_reference="https://example.com/inactive.jpg",
            is_active=True,
            display_order=2,
            advertiser="Inactive"
        )
    )
    db_session.commit()

    assert len(facade.eligible_top_content(db_session, result.organization.id)) == 1
    assert len(facade.eligible_ads(db_session, result.organization.id)) == 2


def test_fallback_state_reported_when_no_ads(db_session):
    from app.services.bootstrap_service import bootstrap_mvp_data

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    result.ad.is_active = False
    db_session.commit()

    state = facade.get_display_state(db_session, result.organization.id)

    assert state.fallback_active is True
    assert state.ads == []


def test_open_display_signature_accepts_session_organization_user_and_roles(db_session):
    from app.services.bootstrap_service import bootstrap_mvp_data

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()

    sig = inspect.signature(facade.open_display)
    params = list(sig.parameters.keys())
    assert "session" in params
    assert "organization_id" in params
    assert "user_id" in params
    assert "user_roles" in params
