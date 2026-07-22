from decimal import Decimal

from app.api.schemas import (
    AdItemSchema,
    BrandingLayout,
    ContentItemSchema,
    DisplayEventSchema,
    EventBrandingSchema,
    EventConfigurationSchema,
    FixedEligibleContentItemSchema,
    IframeSchema,
    KioskConfigurationSchema,
    MediaFileReferenceSchema,
    UserSchema,
)
from app.repositories.models.ad import ClientAdItem
from app.repositories.models.content import TopContentItem
from app.repositories.models.display_event import DisplayEvent
from app.repositories.models.event_configuration import EventConfiguration
from app.api.schemas import DisplayDeviceSchema, DisplayScaleEntry, IframeSchema, IframeWithDisplayScalesSchema
from app.repositories.models.display_device import DisplayDevice
from app.repositories.models.iframe import Iframe
from app.repositories.models.kiosk_configuration import KioskDisplayConfiguration
from app.repositories.models.media import MediaFileReference
from app.repositories.models.user import User


def to_media_schema(media: MediaFileReference | None) -> MediaFileReferenceSchema | None:
    if media is None:
        return None
    return MediaFileReferenceSchema(
        id=media.id,
        mediaType=media.media_type,
        contentType=media.content_type,
        fileSizeBytes=media.file_size_bytes,
        originalFilename=media.original_filename,
        mediaUrl=media.public_reference
    )


def to_configuration_schema(configuration: KioskDisplayConfiguration) -> KioskConfigurationSchema:
    return KioskConfigurationSchema(
        id=configuration.id,
        name=configuration.name,
        topRegionRatio=configuration.top_region_ratio,
        bottomRegionRatio=configuration.bottom_region_ratio,
        defaultTopDurationSeconds=configuration.default_top_duration_seconds,
        defaultAdDurationSeconds=configuration.default_ad_duration_seconds,
        defaultTopRotationAnimation=configuration.default_top_rotation_animation,
        defaultAdRotationAnimation=configuration.default_ad_rotation_animation,
        defaultTopAnimationDurationMilliseconds=configuration.default_top_animation_duration_milliseconds,
        defaultAdAnimationDurationMilliseconds=configuration.default_ad_animation_duration_milliseconds,
        inlineAdCount=configuration.inline_ad_count,
        inlineAdItemBorderRadiusPx=configuration.inline_ad_item_border_radius_px,
        inlineAdItemBorderWidthPx=configuration.inline_ad_item_border_width_px,
        inlineAdItemBorderColor=configuration.inline_ad_item_border_color,
        remoteControlPollingSeconds=configuration.remote_control_polling_seconds,
        videoEndDelaySeconds=configuration.video_end_delay_seconds,
        isEnabled=configuration.is_enabled,
    )


def to_event_configuration_schema(
    row: EventConfiguration,
    media: MediaFileReference | None = None,
) -> EventConfigurationSchema:
    return EventConfigurationSchema(
        id=row.id,
        organizationId=row.organization_id,
        eventName=row.event_name,
        organizerName=row.organizer_name,
        organizerLogoMediaFile=to_media_schema(media),
        eventDurationMinutes=row.event_duration_minutes,
        logoLayout=_coerce_layout(row.logo_layout),
        eventNameLayout=_coerce_layout(row.event_name_layout),
        createdAt=row.created_at,
        updatedAt=row.updated_at,
    )


def to_event_branding_schema(row: EventConfiguration, media_url: str | None) -> EventBrandingSchema:
    return EventBrandingSchema(
        eventName=row.event_name,
        organizerName=row.organizer_name,
        organizerLogoUrl=media_url,
        logoLayout=_coerce_layout(row.logo_layout),
        eventNameLayout=_coerce_layout(row.event_name_layout),
    )


def _coerce_layout(value: object) -> BrandingLayout | None:
    """Validate a stored JSON layout dict against the BrandingLayout model.

    Returns None when the column is NULL or contains an empty
    object, so the kiosko CSS falls back to the documented visual
    defaults. Raises ValueError when the stored value violates the
    range constraints; the caller surfaces it as HTTP 500 because
    it would indicate data corruption (the API boundary validates
    every write).
    """
    if value is None or value == {}:
        return None
    if not isinstance(value, dict):
        raise ValueError(f"Branding layout must be a JSON object, got {type(value).__name__}.")
    return BrandingLayout.model_validate(value)


def to_content_schema(
    item: TopContentItem,
    *,
    effective_duration_seconds: int | None = None,
    effective_rotation_animation: str | None = None,
    effective_animation_duration_milliseconds: int | None = None
) -> ContentItemSchema:
    return ContentItemSchema(
        id=item.id,
        title=item.title,
        contentType=item.content_type,
        sourceReference=item.source_reference,
        mediaFile=to_media_schema(getattr(item, "media_file", None)),
        approvedDomainId=item.approved_domain_id,
        isActive=item.is_active,
        displayOrder=item.display_order,
        durationSeconds=item.duration_seconds,
        rotationAnimation=item.rotation_animation,
        animationDurationMilliseconds=item.animation_duration_milliseconds,
        effectiveDurationSeconds=effective_duration_seconds,
        effectiveRotationAnimation=effective_rotation_animation,
        effectiveAnimationDurationMilliseconds=effective_animation_duration_milliseconds,
        availableFrom=item.available_from,
        availableUntil=item.available_until,
        isFixed=item.is_fixed,
        isNovelty=item.is_novelty,
        recurringEveryXIterations=item.recurring_every_x_iterations,
    )


def to_fixed_eligible_content_schema(item: TopContentItem) -> FixedEligibleContentItemSchema:
    media = getattr(item, "media_file", None)
    return FixedEligibleContentItemSchema(
        id=item.id,
        title=item.title,
        contentType=item.content_type,
        mediaUrl=getattr(media, "public_reference", None) if media else None,
        thumbnailUrl=getattr(media, "public_reference", None) if media else None,
        durationSeconds=item.duration_seconds,
    )


def to_ad_schema(
    item: ClientAdItem,
    *,
    effective_duration_seconds: int | None = None,
    effective_rotation_animation: str | None = None,
    effective_animation_duration_milliseconds: int | None = None
) -> AdItemSchema:
    return AdItemSchema(
        id=item.id,
        sourceReference=item.source_reference,
        mediaFile=to_media_schema(getattr(item, "media_file", None)),
        isActive=item.is_active,
        displayOrder=item.display_order,
        durationSeconds=item.duration_seconds,
        rotationAnimation=item.rotation_animation,
        animationDurationMilliseconds=item.animation_duration_milliseconds,
        effectiveDurationSeconds=effective_duration_seconds,
        effectiveRotationAnimation=effective_rotation_animation,
        effectiveAnimationDurationMilliseconds=effective_animation_duration_milliseconds,
        availableFrom=item.available_from,
        availableUntil=item.available_until,
        advertiser=item.advertiser
    )


def to_iframe_schema(iframe: Iframe) -> IframeSchema:
    return IframeSchema(
        id=iframe.id,
        organizationId=iframe.organization_id,
        url=iframe.url,
        scaleX=float(iframe.scale_x),
        scaleY=float(iframe.scale_y),
        createdAt=iframe.created_at,
        updatedAt=iframe.updated_at,
    )


def to_iframe_with_display_scales_schema(
    iframe: Iframe,
    display_scales: list[DisplayScaleEntry],
) -> IframeWithDisplayScalesSchema:
    return IframeWithDisplayScalesSchema(
        id=iframe.id,
        organizationId=iframe.organization_id,
        url=iframe.url,
        scaleX=float(iframe.scale_x),
        scaleY=float(iframe.scale_y),
        createdAt=iframe.created_at,
        updatedAt=iframe.updated_at,
        displayScales=display_scales,
    )


def to_display_device_schema(device: DisplayDevice) -> DisplayDeviceSchema:
    return DisplayDeviceSchema(
        id=device.id,
        organizationId=device.organization_id,
        label=device.label,
        lastSeenAt=device.last_seen_at,
        createdAt=device.created_at,
        updatedAt=device.updated_at,
    )


def to_event_schema(event: DisplayEvent) -> DisplayEventSchema:
    return DisplayEventSchema(
        id=event.id,
        eventType=event.event_type,
        severity=event.severity,
        message=event.message,
        createdAt=event.created_at
    )


def to_user_schema(user: User, roles: list[str]) -> UserSchema:
    return UserSchema(id=user.id, email=user.email, displayName=user.display_name, isActive=user.is_active, roles=roles)
