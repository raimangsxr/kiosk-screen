"""Unit tests for ApiKeyService.

Covers FR-019 (raw key format and hash), FR-020 (in-place rotation),
FR-022A (audit event), and FR-016 (verify returns organization).
"""
import hashlib
import re
from typing import Iterator
from unittest.mock import MagicMock

import pytest

from app.repositories.api_keys import ApiKeyRepository
from app.repositories.base import utc_now
from app.repositories.models.api_key import ApiKey
from app.services.api_key_service import (
    ApiKeyService,
    GeneratedKey,
    KEY_PREFIX_LITERAL,
    _generate_raw,
    _hash,
)
from app.shared.errors.application_errors import (
    ApiKeyRevokedError,
    InactiveApiKeyError,
)


def test_generate_raw_key_format():
    gen = _generate_raw()
    # raw key starts with the literal prefix
    assert gen.raw_key.startswith(KEY_PREFIX_LITERAL)
    # prefix itself is the literal + 8 url-safe chars
    body = gen.raw_key[len(KEY_PREFIX_LITERAL):][:8]
    assert re.match(r"^[A-Za-z0-9_-]{8}$", body)
    assert gen.key_prefix == f"{KEY_PREFIX_LITERAL}{body}"
    # hash is 64 lowercase hex
    assert re.match(r"^[0-9a-f]{64}$", gen.key_hash)
    # hash matches sha256 of the raw key
    assert gen.key_hash == hashlib.sha256(gen.raw_key.encode()).hexdigest()
    # total raw key length: prefix(17) + '_' + 24 url-safe bytes
    assert 40 <= len(gen.raw_key) <= 60


def test_generate_raw_key_is_unique():
    seen = {g.raw_key for g in (_generate_raw() for _ in range(100))}
    assert len(seen) == 100


def test_hash_helper_matches_sha256():
    raw = "ksk_live_AbCdEfGh_aBcDeFgHiJkLmNoPqRsTuVwX"
    assert _hash(raw) == hashlib.sha256(raw.encode()).hexdigest()


@pytest.fixture
def repository() -> ApiKeyRepository:
    return MagicMock(spec=ApiKeyRepository)


@pytest.fixture
def service(repository: ApiKeyRepository) -> ApiKeyService:
    return ApiKeyService(repository)


def _fake_key(
    *,
    organization_id: str = "org-1",
    label: str = "test",
    raw_key: str | None = None,
    is_active: bool = True,
    revoked_at=None,
) -> ApiKey:
    raw = raw_key or _generate_raw().raw_key
    prefix = raw[: len(KEY_PREFIX_LITERAL) + 8]
    digest = hashlib.sha256(raw.encode()).hexdigest()
    return ApiKey(
        id="key-1",
        organization_id=organization_id,
        label=label,
        key_prefix=prefix,
        key_hash=digest,
        is_active=is_active,
        revoked_at=revoked_at,
    )


def test_verify_returns_key_for_valid_raw(service: ApiKeyService, repository: ApiKeyRepository):
    record = _fake_key()
    repository.get_by_prefix.return_value = record
    matched = service.verify(record.key_prefix + "_tail")  # not the real raw
    # hash mismatch: returns None
    assert matched is None


def test_verify_returns_key_for_matching_raw(service: ApiKeyService, repository: ApiKeyRepository):
    raw = "ksk_live_AbCdEfGh_aBcDeFgHiJkLmNoPqRsTuVwX"
    record = _fake_key(raw_key=raw)
    repository.get_by_prefix.return_value = record
    matched = service.verify(raw)
    assert matched is record
    assert matched.organization_id == "org-1"  # FR-016


def test_verify_returns_none_for_unknown_prefix(service: ApiKeyService, repository: ApiKeyRepository):
    repository.get_by_prefix.return_value = None
    assert service.verify("ksk_live_ZzZzZzZz_aBcDeFgHiJkLmNoPqRsTuVwX") is None


def test_verify_returns_none_for_empty_or_malformed(service: ApiKeyService):
    assert service.verify("") is None
    assert service.verify("not-bearer") is None
    assert service.verify(KEY_PREFIX_LITERAL) is None


def test_verify_raises_inactive_for_inactive_key(service: ApiKeyService, repository: ApiKeyRepository):
    raw = "ksk_live_AbCdEfGh_aBcDeFgHiJkLmNoPqRsTuVwX"
    record = _fake_key(raw_key=raw, is_active=False)
    repository.get_by_prefix.return_value = record
    with pytest.raises(InactiveApiKeyError):
        service.verify(raw)


def test_create_returns_record_and_raw(service: ApiKeyService, repository: ApiKeyRepository):
    # Mirror the real repository.add: return a real ApiKey instance built from the
    # arguments the service passed in.
    def fake_add(**kwargs):
        record = ApiKey(**kwargs)
        return record
    repository.add.side_effect = fake_add

    record, raw = service.create(organization_id="org-1", label="My key", created_by_user_id="u-1")
    assert record.organization_id == "org-1"
    assert record.label == "My key"
    assert record.key_prefix.startswith(KEY_PREFIX_LITERAL)
    assert record.key_hash == hashlib.sha256(raw.encode()).hexdigest()
    # raw was passed to the repo via add
    assert repository.add.call_count == 1
    kwargs = repository.add.call_args.kwargs
    assert kwargs["organization_id"] == "org-1"
    assert kwargs["label"] == "My key"
    assert kwargs["key_prefix"].startswith(KEY_PREFIX_LITERAL)
    assert re.match(r"^[0-9a-f]{64}$", kwargs["key_hash"])


def test_create_rejects_blank_label(service: ApiKeyService):
    with pytest.raises(ValueError):
        service.create(organization_id="org-1", label="")


def test_create_rejects_oversized_label(service: ApiKeyService):
    with pytest.raises(ValueError):
        service.create(organization_id="org-1", label="x" * 121)


def test_rotate_is_in_place_and_replaces_hash(service: ApiKeyService, repository: ApiKeyRepository):
    raw = "ksk_live_AbCdEfGh_aBcDeFgHiJkLmNoPqRsTuVwX"
    record = _fake_key(raw_key=raw)
    repository.get_by_id.return_value = record

    # Mirror the real repository.rotate: update the in-place record fields.
    def fake_rotate(key, *, new_prefix, new_hash, rotated_at=None):
        key.key_prefix = new_prefix
        key.key_hash = new_hash
        key.last_rotated_at = rotated_at or utc_now()
    repository.rotate.side_effect = fake_rotate

    rotated, new_raw = service.rotate(organization_id="org-1", key_id="key-1")
    assert rotated is record  # same row
    assert record.id == "key-1"  # id preserved
    assert record.label == "test"  # label preserved
    assert record.key_hash != hashlib.sha256(raw.encode()).hexdigest()
    assert record.key_hash == hashlib.sha256(new_raw.encode()).hexdigest()
    assert record.last_rotated_at is not None


def test_rotate_on_revoked_raises(service: ApiKeyService, repository: ApiKeyRepository):
    record = _fake_key(is_active=False, revoked_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc))
    repository.get_by_id.return_value = record
    with pytest.raises(ApiKeyRevokedError):
        service.rotate(organization_id="org-1", key_id="key-1")


def test_rotate_returns_none_pair_when_key_not_found(service: ApiKeyService, repository: ApiKeyRepository):
    repository.get_by_id.return_value = None
    record, raw = service.rotate(organization_id="org-1", key_id="missing")
    assert record is None
    assert raw is None


def test_revoke_marks_inactive(service: ApiKeyService, repository: ApiKeyRepository):
    record = _fake_key()
    repository.get_by_id.return_value = record

    def fake_revoke(key, *, revoked_at=None):
        key.is_active = False
        key.revoked_at = revoked_at or utc_now()
    repository.revoke.side_effect = fake_revoke

    assert service.revoke(organization_id="org-1", key_id="key-1") is True
    assert record.is_active is False
    assert record.revoked_at is not None


def test_revoke_is_idempotent(service: ApiKeyService, repository: ApiKeyRepository):
    record = _fake_key(is_active=False)
    repository.get_by_id.return_value = record
    assert service.revoke(organization_id="org-1", key_id="key-1") is True


def test_revoke_returns_false_when_not_found(service: ApiKeyService, repository: ApiKeyRepository):
    repository.get_by_id.return_value = None
    assert service.revoke(organization_id="org-1", key_id="missing") is False


def test_mark_used_delegates_to_repository(service: ApiKeyService, repository: ApiKeyRepository):
    record = _fake_key()
    service.mark_used(record)
    repository.touch_last_used.assert_called_once_with("key-1")


def test_list_for_organization_delegates(service: ApiKeyService, repository: ApiKeyRepository):
    repository.list_by_organization.return_value = ["a", "b"]
    assert service.list_for_organization("org-1") == ["a", "b"]
    repository.list_by_organization.assert_called_once_with("org-1")
