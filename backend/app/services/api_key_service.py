import hashlib
import hmac
import secrets
from dataclasses import dataclass
from typing import Optional

from app.repositories.api_keys import ApiKeyRepository
from app.repositories.base import utc_now
from app.repositories.models.api_key import ApiKey
from app.shared.errors.application_errors import ApiKeyNotRevokedError, ApiKeyRevokedError, InactiveApiKeyError, InvalidApiKeyError


KEY_PREFIX_LITERAL = "ksk_live_"


@dataclass(frozen=True)
class GeneratedKey:
    raw_key: str
    key_prefix: str
    key_hash: str


def _generate_raw() -> GeneratedKey:
    body = secrets.token_urlsafe(6)  # 8 url-safe chars
    prefix = f"{KEY_PREFIX_LITERAL}{body}"
    random_tail = secrets.token_urlsafe(24)
    raw = f"{prefix}_{random_tail}"
    digest = hashlib.sha256(raw.encode()).hexdigest()
    return GeneratedKey(raw_key=raw, key_prefix=prefix, key_hash=digest)


def _hash(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


class ApiKeyService:
    def __init__(self, repository: ApiKeyRepository) -> None:
        self.repository = repository

    @staticmethod
    def generate_raw_key() -> GeneratedKey:
        return _generate_raw()

    @staticmethod
    def hash_key(raw_key: str) -> str:
        return _hash(raw_key)

    def verify(self, raw_key: str) -> Optional[ApiKey]:
        if not raw_key or not raw_key.startswith(KEY_PREFIX_LITERAL):
            return None
        prefix_body = raw_key[len(KEY_PREFIX_LITERAL):][:8]
        if not prefix_body:
            return None
        prefix = f"{KEY_PREFIX_LITERAL}{prefix_body}"
        record = self.repository.get_by_prefix(prefix)
        if record is None:
            return None
        candidate_hash = _hash(raw_key)
        if not hmac.compare_digest(candidate_hash, record.key_hash):
            return None
        if not record.is_active:
            raise InactiveApiKeyError()
        return record

    def create(
        self,
        *,
        organization_id: str,
        label: str,
        created_by_user_id: Optional[str] = None,
    ) -> tuple[ApiKey, str]:
        if not label or not label.strip():
            raise ValueError("Label is required.")
        if len(label) > 120:
            raise ValueError("Label must be 120 characters or fewer.")
        generated = _generate_raw()
        record = self.repository.add(
            organization_id=organization_id,
            label=label.strip(),
            key_prefix=generated.key_prefix,
            key_hash=generated.key_hash,
            created_by_user_id=created_by_user_id,
        )
        return record, generated.raw_key

    def rotate(self, organization_id: str, key_id: str) -> tuple[ApiKey, str]:
        record = self.repository.get_by_id(organization_id, key_id)
        if record is None:
            return None, None  # type: ignore[return-value]
        if not record.is_active or record.revoked_at is not None:
            raise ApiKeyRevokedError()
        generated = _generate_raw()
        self.repository.rotate(
            record,
            new_prefix=generated.key_prefix,
            new_hash=generated.key_hash,
        )
        return record, generated.raw_key

    def revoke(self, organization_id: str, key_id: str) -> bool:
        record = self.repository.get_by_id(organization_id, key_id)
        if record is None:
            return False
        if not record.is_active:
            return True
        self.repository.revoke(record)
        return True

    def delete(self, organization_id: str, key_id: str) -> bool:
        record = self.repository.get_by_id(organization_id, key_id)
        if record is None:
            return False
        if record.is_active:
            raise ApiKeyNotRevokedError()
        self.repository.delete(record)
        return True

    def mark_used(self, key: ApiKey) -> None:
        self.repository.touch_last_used(key.id)

    def mark_used_by_id(self, key_id: str) -> None:
        self.repository.touch_last_used(key_id)
        # The caller may have already committed the surrounding transaction; ensure
        # the last_used_at write is visible to subsequent reads.
        try:
            self.repository.session.commit()
        except Exception:
            self.repository.session.rollback()
            raise

    def list_for_organization(self, organization_id: str) -> list[ApiKey]:
        return self.repository.list_by_organization(organization_id)
