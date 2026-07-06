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
    remember_me: bool = Field(default=False, alias="rememberMe")


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


class CreateUserRequest(UserRequest):
    password: str = Field(min_length=8)


class AdminPasswordResetRequest(CamelModel):
    password: str = Field(min_length=8)


class ChangePasswordRequest(CamelModel):
    current_password: str = Field(min_length=1, alias="currentPassword")
    new_password: str = Field(min_length=8, alias="newPassword")


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
    inline_ad_item_border_radius_px: int = Field(default=5, alias="inlineAdItemBorderRadiusPx", ge=0, le=32)
    inline_ad_item_border_width_px: int = Field(default=0, alias="inlineAdItemBorderWidthPx", ge=0, le=8)
    inline_ad_item_border_color: str = Field(default="#ffffff", alias="inlineAdItemBorderColor", max_length=32)
    remote_control_polling_seconds: int = Field(default=3, alias="remoteControlPollingSeconds", ge=1, le=60)
    video_end_delay_seconds: int = Field(default=2, alias="videoEndDelaySeconds", ge=0, le=30)
    is_enabled: bool = Field(alias="isEnabled")


class KioskConfigurationRequest(CamelModel):
    name: str
    top_region_ratio: int = Field(default=5, alias="topRegionRatio", ge=1, le=20)
    bottom_region_ratio: int = Field(default=1, alias="bottomRegionRatio", ge=1, le=20)
    default_top_duration_seconds: int = Field(alias="defaultTopDurationSeconds", ge=1)
    default_ad_duration_seconds: int = Field(alias="defaultAdDurationSeconds", ge=1)
    default_top_rotation_animation: str = Field(default="none", alias="defaultTopRotationAnimation")
    default_ad_rotation_animation: str = Field(default="none", alias="defaultAdRotationAnimation")
    default_top_animation_duration_milliseconds: int = Field(default=300, alias="defaultTopAnimationDurationMilliseconds", ge=1)
    default_ad_animation_duration_milliseconds: int = Field(default=300, alias="defaultAdAnimationDurationMilliseconds", ge=1)
    inline_ad_count: int = Field(default=1, alias="inlineAdCount", ge=1)
    inline_ad_item_border_radius_px: int = Field(default=5, alias="inlineAdItemBorderRadiusPx", ge=0, le=32)
    inline_ad_item_border_width_px: int = Field(default=0, alias="inlineAdItemBorderWidthPx", ge=0, le=8)
    inline_ad_item_border_color: str = Field(default="#ffffff", alias="inlineAdItemBorderColor", max_length=32)
    remote_control_polling_seconds: int = Field(default=3, alias="remoteControlPollingSeconds", ge=1, le=60)
    video_end_delay_seconds: int = Field(default=2, alias="videoEndDelaySeconds", ge=0, le=30)
    is_enabled: bool = Field(alias="isEnabled")


class EventConfigurationSchema(CamelModel):
    id: UUID
    organization_id: UUID = Field(alias="organizationId")
    event_name: str = Field(alias="eventName")
    organizer_name: str = Field(alias="organizerName")
    organizer_logo_media_file: MediaFileReferenceSchema | None = Field(default=None, alias="organizerLogoMediaFile")
    event_duration_minutes: int = Field(alias="eventDurationMinutes", ge=1, le=1440)
    logo_layout: "BrandingLayout | None" = Field(default=None, alias="logoLayout")
    event_name_layout: "BrandingLayout | None" = Field(default=None, alias="eventNameLayout")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class EventConfigurationRequest(CamelModel):
    event_name: str = Field(default="", alias="eventName", max_length=255)
    organizer_name: str = Field(default="", alias="organizerName", max_length=255)
    event_duration_minutes: int = Field(default=240, alias="eventDurationMinutes", ge=1, le=1440)
    logo_layout: str | None = Field(default=None, alias="logoLayout")
    event_name_layout: str | None = Field(default=None, alias="eventNameLayout")


class EventBrandingSchema(CamelModel):
    event_name: str = Field(default="", alias="eventName")
    organizer_name: str = Field(default="", alias="organizerName")
    organizer_logo_url: str | None = Field(default=None, alias="organizerLogoUrl")
    logo_layout: "BrandingLayout | None" = Field(default=None, alias="logoLayout")
    event_name_layout: "BrandingLayout | None" = Field(default=None, alias="eventNameLayout")


class BrandingLayout(CamelModel):
    """Visual layout for a single branding element (logo or event-name pill).

    All fields are optional. A fully-empty or missing object means
    "use the documented visual default". Values are interpreted by
    the kiosk as viewport-relative units:

      - `size`: vh for the logo, vw for the event name (1..50).
      - `x`: vw from the overlay container's left edge (0..100).
      - `y`: vh from the overlay container's top edge (0..100).
      - `transparency`: percent, applied as `opacity: value / 100` (0..100).
      - `borderRadius`: vh (0..50).

    All numeric fields are stored as floats on disk for backward
    compatibility with rows saved before CHG-024 — but the kiosk
    admin form only ever writes integers (MatSlider `step: 1`),
    and `model_dump` emits whole-number values once the stored
    payload has been coerced through Pydantic's lax int parser.
    """

    size: float | None = Field(default=None, ge=1, le=50)
    x: float | None = Field(default=None, ge=0, le=100)
    y: float | None = Field(default=None, ge=0, le=100)
    transparency: int | None = Field(default=None, ge=0, le=100)
    border_radius: float | None = Field(default=None, ge=0, le=50, alias="borderRadius")


EventConfigurationSchema.model_rebuild()
EventBrandingSchema.model_rebuild()


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
    is_fixed: bool = Field(default=False, alias="isFixed")
    is_novelty: bool = Field(default=False, alias="isNovelty")
    recurring_every_x_iterations: int | None = Field(default=None, alias="recurringEveryXIterations", ge=1)


class RemoteControlStateSchema(CamelModel):
    content_mode: Literal["loop", "iframe", "fixed"] = Field(alias="contentMode")
    selected_iframe_id: UUID | None = Field(default=None, alias="selectedIframeId")
    selected_fixed_content_id: UUID | None = Field(default=None, alias="selectedFixedContentId")
    ads_visible: bool = Field(alias="adsVisible")
    fullscreen_requested: bool = Field(default=False, alias="fullscreenRequested")
    navigation_command: Literal["next", "previous", "pause", "resume", "jump_to", ""] | None = Field(default=None, alias="navigationCommand")
    navigation_command_id: UUID | None = Field(default=None, alias="navigationCommandId")
    jump_to_content_id: UUID | None = Field(default=None, alias="jumpToContentId")
    updated_at: datetime = Field(alias="updatedAt")


class RemoteControlStateRequest(CamelModel):
    content_mode: Literal["loop", "iframe", "fixed"] = Field(alias="contentMode")
    selected_iframe_id: UUID | None = Field(default=None, alias="selectedIframeId")
    selected_fixed_content_id: UUID | None = Field(default=None, alias="selectedFixedContentId")
    ads_visible: bool = Field(alias="adsVisible")
    fullscreen_requested: bool = Field(default=False, alias="fullscreenRequested")


class RemoteControlNavigationRequest(CamelModel):
    command: Literal["next", "previous", "pause", "resume", "jump_to"]
    target_content_id: UUID | None = Field(default=None, alias="targetContentId")


class RemoteControlAdminStateSchema(RemoteControlStateSchema):
    selected_iframe: IframeSchema | None = Field(default=None, alias="selectedIframe")
    display_session_active: bool = Field(default=True, alias="displaySessionActive")


class FixedEligibleContentItemSchema(CamelModel):
    id: UUID
    title: str
    content_type: Literal["photo", "video"] = Field(alias="contentType")
    media_url: str | None = Field(default=None, alias="mediaUrl")
    thumbnail_url: str | None = Field(default=None, alias="thumbnailUrl")
    duration_seconds: int | None = Field(default=None, alias="durationSeconds", ge=1)


class RemoteControlIframeOptionsSchema(CamelModel):
    items: list[IframeSchema]
    fixed_eligible_contents: list[FixedEligibleContentItemSchema] = Field(default_factory=list, alias="fixedEligibleContents")


class ContentItemRequest(CamelModel):
    title: str
    content_type: str | None = Field(default=None, alias="contentType")
    source_reference: str | None = Field(default=None, alias="sourceReference")
    approved_domain_id: UUID | None = Field(default=None, alias="approvedDomainId")
    is_active: bool | None = Field(default=None, alias="isActive")
    display_order: int | None = Field(default=None, alias="displayOrder", ge=1)
    duration_seconds: int | None = Field(default=None, alias="durationSeconds", ge=1)
    rotation_animation: str | None = Field(default=None, alias="rotationAnimation")
    animation_duration_milliseconds: int | None = Field(default=None, alias="animationDurationMilliseconds", ge=1)
    available_from: datetime | None = Field(default=None, alias="availableFrom")
    available_until: datetime | None = Field(default=None, alias="availableUntil")
    is_fixed: bool | None = Field(default=None, alias="isFixed")
    recurring_every_x_iterations: int | None = Field(default=None, alias="recurringEveryXIterations", ge=1)


class RotationEventRequest(CamelModel):
    event_type: Literal["content_rotation_empty"] = Field(alias="eventType")
    payload: dict = Field(default_factory=dict)


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
    fixed_eligible_contents: list[FixedEligibleContentItemSchema] = Field(
        default_factory=list, alias="fixedEligibleContents"
    )


class DisplayEventSchema(CamelModel):
    id: UUID
    event_type: str = Field(alias="eventType")
    severity: str
    message: str
    created_at: datetime = Field(alias="createdAt")
