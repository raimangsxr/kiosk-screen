from app.api.schemas import (
    AdItemSchema,
    ApprovedEmbeddedDomainSchema,
    ClientSchema,
    ContentItemSchema,
    DisplayEventSchema,
    KioskConfigurationSchema,
    MediaFileReferenceSchema,
    UserSchema,
)
from app.repositories.models.ad import ClientAdItem
from app.repositories.models.approved_domain import ApprovedEmbeddedDomain
from app.repositories.models.client import Client
from app.repositories.models.content import TopContentItem
from app.repositories.models.display_event import DisplayEvent
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
        configuredEventDurationMinutes=configuration.configured_event_duration_minutes,
        isEnabled=configuration.is_enabled
    )


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
        availableUntil=item.available_until
    )


def to_client_schema(client: Client) -> ClientSchema:
    return ClientSchema(id=client.id, name=client.name, isActive=client.is_active)


def to_ad_schema(
    item: ClientAdItem,
    *,
    effective_duration_seconds: int | None = None,
    effective_rotation_animation: str | None = None,
    effective_animation_duration_milliseconds: int | None = None
) -> AdItemSchema:
    return AdItemSchema(
        id=item.id,
        clientId=item.client_id,
        label=item.label,
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
        availableUntil=item.available_until
    )


def to_domain_schema(domain: ApprovedEmbeddedDomain) -> ApprovedEmbeddedDomainSchema:
    return ApprovedEmbeddedDomainSchema(id=domain.id, domain=domain.domain, isActive=domain.is_active)


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
