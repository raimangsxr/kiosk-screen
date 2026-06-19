from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.repositories.base import new_id, utc_now
from app.repositories.models.api_key import ApiKey


class ApiKeyRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(
        self,
        *,
        organization_id: str,
        label: str,
        key_prefix: str,
        key_hash: str,
        is_active: bool = True,
        created_by_user_id: Optional[str] = None,
    ) -> ApiKey:
        record = ApiKey(
            id=new_id(),
            organization_id=organization_id,
            label=label,
            key_prefix=key_prefix,
            key_hash=key_hash,
            is_active=is_active,
            created_by_user_id=created_by_user_id,
        )
        self.session.add(record)
        return record

    def get_by_id(self, organization_id: str, key_id: str) -> Optional[ApiKey]:
        return (
            self.session.query(ApiKey)
            .filter(
                ApiKey.organization_id == organization_id,
                ApiKey.id == key_id,
            )
            .one_or_none()
        )

    def get_by_prefix(self, key_prefix: str) -> Optional[ApiKey]:
        return (
            self.session.query(ApiKey)
            .filter(ApiKey.key_prefix == key_prefix)
            .one_or_none()
        )

    def list_by_organization(self, organization_id: str) -> list[ApiKey]:
        return list(
            self.session.query(ApiKey)
            .filter(ApiKey.organization_id == organization_id)
            .order_by(ApiKey.created_at.desc())
            .all()
        )

    def touch_last_used(self, key_id: str) -> None:
        record = (
            self.session.query(ApiKey)
            .filter(ApiKey.id == key_id)
            .one_or_none()
        )
        if record is not None:
            record.last_used_at = utc_now()

    def rotate(
        self,
        key: ApiKey,
        *,
        new_prefix: str,
        new_hash: str,
        rotated_at: Optional[datetime] = None,
    ) -> None:
        key.key_prefix = new_prefix
        key.key_hash = new_hash
        key.last_rotated_at = rotated_at or utc_now()

    def revoke(self, key: ApiKey, *, revoked_at: Optional[datetime] = None) -> None:
        key.is_active = False
        key.revoked_at = revoked_at or utc_now()

    def count(self, organization_id: str) -> int:
        return (
            self.session.query(ApiKey)
            .filter(ApiKey.organization_id == organization_id)
            .count()
        )
