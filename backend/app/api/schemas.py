from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class ErrorSchema(CamelModel):
    code: str
    message: str
    details: dict[str, object] | None = None


class LoginRequest(CamelModel):
    email: str
    password: str = Field(min_length=1)


class UserSchema(CamelModel):
    id: UUID
    email: str
    display_name: str = Field(alias="displayName")
    roles: list[str]


class KioskConfigurationSchema(CamelModel):
    id: UUID
    name: str
    top_region_ratio: int = Field(alias="topRegionRatio")
    bottom_region_ratio: int = Field(alias="bottomRegionRatio")
    default_top_duration_seconds: int = Field(alias="defaultTopDurationSeconds", ge=1)
    default_ad_duration_seconds: int = Field(alias="defaultAdDurationSeconds", ge=1)
    configured_event_duration_minutes: int = Field(alias="configuredEventDurationMinutes", ge=1)
    is_enabled: bool = Field(alias="isEnabled")


class ContentItemSchema(CamelModel):
    id: UUID
    title: str
    content_type: str = Field(alias="contentType")
    source_reference: str = Field(alias="sourceReference")
    approved_domain_id: UUID | None = Field(default=None, alias="approvedDomainId")
    is_active: bool = Field(alias="isActive")
    display_order: int = Field(alias="displayOrder", ge=1)
    duration_seconds: int | None = Field(default=None, alias="durationSeconds", ge=1)
    available_from: datetime | None = Field(default=None, alias="availableFrom")
    available_until: datetime | None = Field(default=None, alias="availableUntil")


class ClientSchema(CamelModel):
    id: UUID
    name: str
    is_active: bool = Field(alias="isActive")


class AdItemSchema(CamelModel):
    id: UUID
    client_id: UUID = Field(alias="clientId")
    label: str
    source_reference: str = Field(alias="sourceReference")
    is_active: bool = Field(alias="isActive")
    display_order: int = Field(alias="displayOrder", ge=1)
    duration_seconds: int | None = Field(default=None, alias="durationSeconds", ge=1)
    available_from: datetime | None = Field(default=None, alias="availableFrom")
    available_until: datetime | None = Field(default=None, alias="availableUntil")


class ApprovedEmbeddedDomainSchema(CamelModel):
    id: UUID
    domain: str
    is_active: bool = Field(alias="isActive")


class ReadinessReportSchema(CamelModel):
    ready: bool
    blockers: list[str]
    warnings: list[str]


class DisplayStateSchema(CamelModel):
    configuration: KioskConfigurationSchema
    top_content: list[ContentItemSchema] = Field(alias="topContent")
    ads: list[AdItemSchema]
    fallback_active: bool = Field(alias="fallbackActive")


class DisplayEventSchema(CamelModel):
    id: UUID
    event_type: str = Field(alias="eventType")
    severity: str
    message: str
    created_at: datetime = Field(alias="createdAt")

