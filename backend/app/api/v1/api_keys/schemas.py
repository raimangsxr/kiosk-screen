"""Schemas for the admin API key management endpoints (spec 009 US2)."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import Field

from app.api.schemas import CamelModel
from app.shared.errors.application_errors import (
    MissingTitleError,
    TitleTooLongError,
)


LABEL_MAX_LENGTH = 120


class CreateApiKeyRequest(CamelModel):
    label: str

    @classmethod
    def validate_label(cls, value: str) -> str:
        cleaned = (value or "").strip()
        if not cleaned:
            raise MissingTitleError()
        if len(cleaned) > LABEL_MAX_LENGTH:
            raise TitleTooLongError(LABEL_MAX_LENGTH)
        return cleaned


class ApiKeyRecordSchema(CamelModel):
    id: UUID
    label: str
    key_prefix: str = Field(alias="keyPrefix")
    is_active: bool = Field(alias="isActive")
    created_at: datetime = Field(alias="createdAt")
    last_rotated_at: Optional[datetime] = Field(default=None, alias="lastRotatedAt")
    last_used_at: Optional[datetime] = Field(default=None, alias="lastUsedAt")
    revoked_at: Optional[datetime] = Field(default=None, alias="revokedAt")
    created_by_user_id: Optional[UUID] = Field(default=None, alias="createdByUserId")


class ApiKeyWithRawSecretSchema(CamelModel):
    record: ApiKeyRecordSchema
    raw_key: str = Field(alias="rawKey")