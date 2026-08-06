from __future__ import annotations

from datetime import datetime, timedelta, timezone

import fakeredis
import pytest
from sqlalchemy.orm import Session

from app.application.display_orchestrator import redis_state
from app.auth.device_activation_service import (
    DeviceActivationExpiredError,
    DeviceActivationForbiddenError,
    DeviceActivationNotFoundError,
    authorize_activation,
    poll_activation,
    start_activation,
)
from app.auth.device_activation_store import (
    TTL_SECONDS,
    consume,
    create_pair,
    get_by_device_code,
    is_valid_user_code,
    try_authorize,
)
from app.auth.dependencies import CurrentUser
from app.auth.session_store import ActivationRateLimiter
from app.repositories.models.role_assignment import RoleAssignment
from app.services.bootstrap_service import bootstrap_mvp_data


@pytest.fixture(autouse=True)
def fake_redis() -> fakeredis.FakeRedis:
    fake = fakeredis.FakeRedis(decode_responses=True)
    redis_state.reset_redis_client(fake)
    yield fake
    redis_state.reset_redis_client(None)


@pytest.fixture
def seeded_session(db_session: Session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()
    return result


def _current_user(user, roles: list[str]) -> CurrentUser:
    return CurrentUser(user, roles)


def test_user_code_format_validation() -> None:
    assert is_valid_user_code("ABCDEF") is True
    assert is_valid_user_code("abc def") is True
    assert is_valid_user_code("ABCDE") is False
    assert is_valid_user_code("ABC12F") is False
    assert is_valid_user_code("ABCDEFG") is False


def test_start_returns_device_code_and_six_letter_user_code() -> None:
    result = start_activation()
    assert len(result.user_code) == 6
    assert result.user_code.isalpha() and result.user_code.isupper()
    assert result.device_code
    assert result.poll_interval_seconds == 2
    assert result.activate_url == f"/activate?code={result.user_code}"


def test_authorize_requires_can_open_display(db_session: Session, seeded_session) -> None:
    user_code, _, _ = create_pair()
    viewer = seeded_session.operator
    db_session.add(
        RoleAssignment(
            organization_id=viewer.organization_id,
            user_id=viewer.id,
            role="display_viewer",
        )
    )
    db_session.commit()
    with pytest.raises(DeviceActivationForbiddenError):
        authorize_activation(
            db_session,
            _current_user(viewer, ["display_viewer"]),
            user_code=user_code,
            remember_me=False,
        )


def test_authorize_rejects_inactive_user(db_session: Session, seeded_session) -> None:
    user_code, _, _ = create_pair()
    operator = seeded_session.operator
    operator.is_active = False
    db_session.commit()
    with pytest.raises(Exception) as exc_info:
        authorize_activation(
            db_session,
            _current_user(operator, ["event_operator"]),
            user_code=user_code,
            remember_me=False,
        )
    assert exc_info.value.code == "not_authenticated"


def test_poll_pending_then_authorized_single_use(db_session: Session, seeded_session) -> None:
    user_code, device_code, _ = create_pair()
    operator = seeded_session.operator

    pending = poll_activation(db_session, device_code=device_code)
    assert pending.status == "pending"
    assert pending.user is None

    assert try_authorize(
        user_code,
        user_id=operator.id,
        organization_id=operator.organization_id,
        remember_me=True,
    )

    authorized = poll_activation(db_session, device_code=device_code)
    assert authorized.status == "authorized"
    assert authorized.user is not None
    assert authorized.user.id == operator.id
    assert authorized.remember_me is True

    with pytest.raises(DeviceActivationNotFoundError):
        poll_activation(db_session, device_code=device_code)


def test_expired_code_on_authorize(db_session: Session, seeded_session) -> None:
    user_code, device_code, _ = create_pair()
    record = get_by_device_code(device_code)
    assert record is not None
    record["expiresAt"] = (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat()
    redis_state.redis_set_json(f"device_activation:device:{device_code}", record, ex=TTL_SECONDS)

    operator = seeded_session.operator
    with pytest.raises(DeviceActivationExpiredError):
        authorize_activation(
            db_session,
            _current_user(operator, ["event_operator"]),
            user_code=user_code,
            remember_me=False,
        )


def test_reused_code_after_consume(db_session: Session, seeded_session) -> None:
    user_code, device_code, _ = create_pair()
    operator = seeded_session.operator
    try_authorize(
        user_code,
        user_id=operator.id,
        organization_id=operator.organization_id,
        remember_me=False,
    )
    poll_activation(db_session, device_code=device_code)
    with pytest.raises(DeviceActivationNotFoundError):
        authorize_activation(
            db_session,
            _current_user(operator, ["event_operator"]),
            user_code=user_code,
            remember_me=False,
        )


def test_concurrent_authorize_first_wins(db_session: Session, seeded_session) -> None:
    user_code, device_code, _ = create_pair()
    admin = seeded_session.administrator
    operator = seeded_session.operator

    first = try_authorize(
        user_code,
        user_id=admin.id,
        organization_id=admin.organization_id,
        remember_me=False,
    )
    second = try_authorize(
        user_code,
        user_id=operator.id,
        organization_id=operator.organization_id,
        remember_me=False,
    )
    assert first is not None
    assert second is None

    record = get_by_device_code(device_code)
    assert record is not None
    assert record["authorizedByUserId"] == admin.id


def test_activation_rate_limiter_blocks_after_ten_failures() -> None:
    limiter = ActivationRateLimiter(max_attempts=10, window_seconds=900)
    client_key = "127.0.0.1"
    now = 1_000.0
    for _ in range(9):
        limiter.record_failure(client_key, now=now)
    assert limiter.is_limited(client_key, now=now) is False
    limiter.record_failure(client_key, now=now)
    assert limiter.is_limited(client_key, now=now) is True
    limiter.reset(client_key)
    assert limiter.is_limited(client_key, now=now) is False


def test_poll_expired_device_code_raises(db_session: Session) -> None:
    _, device_code, _ = create_pair()
    record = get_by_device_code(device_code)
    assert record is not None
    record["expiresAt"] = (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat()
    redis_state.redis_set_json(f"device_activation:device:{device_code}", record, ex=TTL_SECONDS)
    with pytest.raises(DeviceActivationExpiredError):
        poll_activation(db_session, device_code=device_code)


def test_consume_deletes_pair(fake_redis: fakeredis.FakeRedis) -> None:
    user_code, device_code, _ = create_pair()
    consumed = consume(device_code)
    assert consumed is not None
    assert get_by_device_code(device_code) is None
    assert fake_redis.get(f"device_activation:user:{user_code}") is None
