from datetime import datetime
from uuid import UUID

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class ErrorSchema(CamelModel):
    code: str
    message: str
    details: dict[str, object] | None = None


class MediaFileReferenceSchema(CamelModel):
    id: UUID
    media_type: str = Field(alias="mediaType")
    content_type: str = Field(alias="contentType")
    file_size_bytes: int = Field(alias="fileSizeBytes", ge=1)
    original_filename: str = Field(alias="originalFilename")
    media_url: str = Field(alias="mediaUrl")


class LoginRequest(CamelModel):
    email: str
    password: str = Field(min_length=1)


class UserSchema(CamelModel):
    id: UUID
    email: str
    display_name: str = Field(alias="displayName")
    is_active: bool = Field(alias="isActive")
    roles: list[str]


class UserRequest(CamelModel):
    email: str
    display_name: str = Field(alias="displayName")
    roles: list[str]
    is_active: bool = Field(alias="isActive")


class KioskConfigurationSchema(CamelModel):
    id: UUID
    name: str
    top_region_ratio: int = Field(alias="topRegionRatio")
    bottom_region_ratio: int = Field(alias="bottomRegionRatio")
    default_top_duration_seconds: int = Field(alias="defaultTopDurationSeconds", ge=1)
    default_ad_duration_seconds: int = Field(alias="defaultAdDurationSeconds", ge=1)
    default_top_rotation_animation: str = Field(default="none", alias="defaultTopRotationAnimation")
    default_ad_rotation_animation: str = Field(default="none", alias="defaultAdRotationAnimation")
    default_top_animation_duration_milliseconds: int = Field(default=300, alias="defaultTopAnimationDurationMilliseconds", ge=1)
    default_ad_animation_duration_milliseconds: int = Field(default=300, alias="defaultAdAnimationDurationMilliseconds", ge=1)
    inline_ad_count: int = Field(default=1, alias="inlineAdCount", ge=1)
    remote_control_polling_seconds: int = Field(default=3, alias="remoteControlPollingSeconds", ge=1, le=60)
    video_end_delay_seconds: int = Field(default=2, alias="videoEndDelaySeconds", ge=0, le=30)
    configured_event_duration_minutes: int = Field(alias="configuredEventDurationMinutes", ge=1)
    is_enabled: bool = Field(alias="isEnabled")


class KioskConfigurationRequest(CamelModel):
    name: str
    default_top_duration_seconds: int = Field(alias="defaultTopDurationSeconds", ge=1)
    default_ad_duration_seconds: int = Field(alias="defaultAdDurationSeconds", ge=1)
    default_top_rotation_animation: str = Field(default="none", alias="defaultTopRotationAnimation")
    default_ad_rotation_animation: str = Field(default="none", alias="defaultAdRotationAnimation")
    default_top_animation_duration_milliseconds: int = Field(default=300, alias="defaultTopAnimationDurationMilliseconds", ge=1)
    default_ad_animation_duration_milliseconds: int = Field(default=300, alias="defaultAdAnimationDurationMilliseconds", ge=1)
    inline_ad_count: int = Field(default=1, alias="inlineAdCount", ge=1)
    remote_control_polling_seconds: int = Field(default=3, alias="remoteControlPollingSeconds", ge=1, le=60)
    video_end_delay_seconds: int = Field(default=2, alias="videoEndDelaySeconds", ge=0, le=30)
    configured_event_duration_minutes: int = Field(alias="configuredEventDurationMinutes", ge=1)
    is_enabled: bool = Field(alias="isEnabled")


class IframeSchema(CamelModel):
    id: UUID
    organization_id: UUID = Field(alias="organizationId")
    url: str
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class IframeRequest(CamelModel):
    url: str = Field(max_length=1024)


class IframeListResponse(CamelModel):
    items: list[IframeSchema]


class ContentItemSchema(CamelModel):
    id: UUID
    title: str
    content_type: Literal["photo", "video"] = Field(alias="contentType")
    source_reference: str = Field(alias="sourceReference")
    media_file: MediaFileReferenceSchema | None = Field(default=None, alias="mediaFile")
    approved_domain_id: UUID | None = Field(default=None, alias="approvedDomainId")
    is_active: bool = Field(alias="isActive")
    display_order: int = Field(alias="displayOrder", ge=1)
    duration_seconds: int | None = Field(default=None, alias="durationSeconds", ge=1)
    rotation_animation: str | None = Field(default=None, alias="rotationAnimation")
    animation_duration_milliseconds: int | None = Field(default=None, alias="animationDurationMilliseconds", ge=1)
    effective_duration_seconds: int | None = Field(default=None, alias="effectiveDurationSeconds", ge=1)
    effective_rotation_animation: str | None = Field(default=None, alias="effectiveRotationAnimation")
    effective_animation_duration_milliseconds: int | None = Field(default=None, alias="effectiveAnimationDurationMilliseconds", ge=1)
    available_from: datetime | None = Field(default=None, alias="availableFrom")
    available_until: datetime | None = Field(default=None, alias="availableUntil")


class RemoteControlStateSchema(CamelModel):
    content_mode: str = Field(alias="contentMode")
    selected_iframe_id: UUID | None = Field(default=None, alias="selectedIframeId")
    ads_visible: bool = Field(alias="adsVisible")
    fullscreen_requested: bool = Field(default=False, alias="fullscreenRequested")
    navigation_command: str | None = Field(default=None, alias="navigationCommand")
    navigation_command_id: UUID | None = Field(default=None, alias="navigationCommandId")
    updated_at: datetime = Field(alias="updatedAt")


class RemoteControlStateRequest(CamelModel):
    content_mode: str = Field(alias="contentMode")
    selected_iframe_id: UUID | None = Field(default=None, alias="selectedIframeId")
    ads_visible: bool = Field(alias="adsVisible")
    fullscreen_requested: bool = Field(default=False, alias="fullscreenRequested")


class RemoteControlNavigationRequest(CamelModel):
    command: str


class RemoteControlAdminStateSchema(RemoteControlStateSchema):
    selected_iframe: IframeSchema | None = Field(default=None, alias="selectedIframe")
    display_session_active: bool = Field(default=True, alias="displaySessionActive")


class RemoteControlIframeOptionsSchema(CamelModel):
    items: list[IframeSchema]


class ContentItemRequest(CamelModel):
    title: str
    content_type: str = Field(alias="contentType")
    source_reference: str = Field(alias="sourceReference")
    approved_domain_id: UUID | None = Field(default=None, alias="approvedDomainId")
    is_active: bool = Field(alias="isActive")
    display_order: int | None = Field(default=None, alias="displayOrder", ge=1)
    duration_seconds: int | None = Field(default=None, alias="durationSeconds", ge=1)
    rotation_animation: str | None = Field(default=None, alias="rotationAnimation")
    animation_duration_milliseconds: int | None = Field(default=None, alias="animationDurationMilliseconds", ge=1)
    available_from: datetime | None = Field(default=None, alias="availableFrom")
    available_until: datetime | None = Field(default=None, alias="availableUntil")


class ReorderRequest(CamelModel):
    ordered_ids: list[str] = Field(alias="orderedIds", min_length=1)


class AdItemSchema(CamelModel):
    id: UUID
    source_reference: str = Field(alias="sourceReference")
    media_file: MediaFileReferenceSchema | None = Field(default=None, alias="mediaFile")
    is_active: bool = Field(alias="isActive")
    display_order: int = Field(alias="displayOrder", ge=1)
    duration_seconds: int | None = Field(default=None, alias="durationSeconds", ge=1)
    rotation_animation: str | None = Field(default=None, alias="rotationAnimation")
    animation_duration_milliseconds: int | None = Field(default=None, alias="animationDurationMilliseconds", ge=1)
    effective_duration_seconds: int | None = Field(default=None, alias="effectiveDurationSeconds", ge=1)
    effective_rotation_animation: str | None = Field(default=None, alias="effectiveRotationAnimation")
    effective_animation_duration_milliseconds: int | None = Field(default=None, alias="effectiveAnimationDurationMilliseconds", ge=1)
    available_from: datetime | None = Field(default=None, alias="availableFrom")
    available_until: datetime | None = Field(default=None, alias="availableUntil")
    advertiser: str | None = Field(default=None, max_length=120)


class AdItemRequest(CamelModel):
    source_reference: str = Field(alias="sourceReference")
    is_active: bool = Field(alias="isActive")
    display_order: int | None = Field(default=None, alias="displayOrder", ge=1)
    duration_seconds: int | None = Field(default=None, alias="durationSeconds", ge=1)
    rotation_animation: str | None = Field(default=None, alias="rotationAnimation")
    animation_duration_milliseconds: int | None = Field(default=None, alias="animationDurationMilliseconds", ge=1)
    available_from: datetime | None = Field(default=None, alias="availableFrom")
    available_until: datetime | None = Field(default=None, alias="availableUntil")
    advertiser: str | None = Field(default=None, max_length=120)


class ReadinessReportSchema(CamelModel):
    ready: bool
    blockers: list[str]
    warnings: list[str]


class DisplayStateSchema(CamelModel):
    configuration: KioskConfigurationSchema
    top_content: list[ContentItemSchema] = Field(alias="topContent")
    ads: list[AdItemSchema]
    remote_control: RemoteControlStateSchema | None = Field(default=None, alias="remoteControl")
    selected_iframe: IframeSchema | None = Field(default=None, alias="selectedIframe")
    fallback_active: bool = Field(alias="fallbackActive")


class DisplayEventSchema(CamelModel):
    id: UUID
    event_type: str = Field(alias="eventType")
    severity: str
    message: str
    created_at: datetime = Field(alias="createdAt")
