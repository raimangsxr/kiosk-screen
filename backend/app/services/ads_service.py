from sqlalchemy.orm import Session
from fastapi import UploadFile

from app.api.schemas import AdItemRequest
from app.domain.availability import validate_availability_window
from app.domain.display_events import create_display_event
from app.domain.media import validate_rotation_animation
from app.repositories.ads import AdRepository
from app.repositories.events import DisplayEventRepository
from app.repositories.models.ad import ClientAdItem
from app.services.display_order import assign_ordered_display_orders, next_display_order
from app.services.media_storage_service import MediaStorageService


class AdsService:
    def __init__(self, session: Session):
        self.session = session
        self.ads = AdRepository(session)

    def list_ads(self, organization_id: str) -> list[ClientAdItem]:
        return self.ads.list(organization_id)

    def get_ad(self, organization_id: str, ad_id: str) -> ClientAdItem:
        ad = self.ads.get(organization_id, ad_id)
        if ad is None:
            raise LookupError("Ad not found.")
        return ad

    def create_ad(self, organization_id: str, user_id: str, payload: AdItemRequest) -> ClientAdItem:
        self._validate_ad(payload)
        display_order = (
            payload.display_order
            if payload.display_order is not None
            else next_display_order(self.session, ClientAdItem, organization_id, "ad")
        )
        ad = ClientAdItem(
            organization_id=organization_id,
            source_reference=payload.source_reference,
            is_active=payload.is_active,
            display_order=display_order,
            duration_seconds=payload.duration_seconds,
            rotation_animation=payload.rotation_animation,
            animation_duration_milliseconds=payload.animation_duration_milliseconds,
            available_from=payload.available_from,
            available_until=payload.available_until,
            advertiser=payload.advertiser,
            created_by_user_id=user_id,
            updated_by_user_id=user_id
        )
        self.ads.add(ad)
        self._record(organization_id, user_id, "ad", "Ad changed")
        self.session.commit()
        return ad

    def update_ad(self, organization_id: str, user_id: str, ad_id: str, payload: AdItemRequest) -> ClientAdItem:
        ad = self.get_ad(organization_id, ad_id)
        self._validate_ad(payload)
        ad.source_reference = payload.source_reference
        ad.is_active = payload.is_active
        ad.display_order = payload.display_order if payload.display_order is not None else ad.display_order
        ad.duration_seconds = payload.duration_seconds
        ad.rotation_animation = payload.rotation_animation
        ad.animation_duration_milliseconds = payload.animation_duration_milliseconds
        ad.available_from = payload.available_from
        ad.available_until = payload.available_until
        ad.advertiser = payload.advertiser
        ad.updated_by_user_id = user_id
        self._record(organization_id, user_id, "ad", "Ad changed", ad.id)
        self.session.commit()
        return ad

    def create_uploaded_ad(self, organization_id: str, user_id: str, upload: UploadFile, payload: AdItemRequest) -> ClientAdItem:
        self._validate_uploaded_ad(payload)
        media = MediaStorageService(self.session).save_upload(organization_id, user_id, upload, "image")
        try:
            display_order = (
                payload.display_order
                if payload.display_order is not None
                else next_display_order(self.session, ClientAdItem, organization_id, "ad")
            )
            ad = ClientAdItem(
                organization_id=organization_id,
                source_reference=media.public_reference,
                media_file_id=media.id,
                is_active=payload.is_active,
                display_order=display_order,
                duration_seconds=payload.duration_seconds,
                rotation_animation=payload.rotation_animation,
                animation_duration_milliseconds=payload.animation_duration_milliseconds,
                available_from=payload.available_from,
                available_until=payload.available_until,
                advertiser=payload.advertiser,
                created_by_user_id=user_id,
                updated_by_user_id=user_id
            )
            self.ads.add(ad)
            self._record(organization_id, user_id, "ad", "Ad media uploaded", ad.id, event_type="media_uploaded")
            self.session.commit()
            return ad
        except Exception:
            self.session.rollback()
            MediaStorageService(self.session).delete_file(media)
            raise

    def delete_ad(self, organization_id: str, user_id: str, ad_id: str) -> None:
        ad = self.get_ad(organization_id, ad_id)
        media_id = ad.media_file_id
        self.ads.delete(ad)
        self._record(organization_id, user_id, "ad", "Ad removed", ad_id)
        self.session.flush()
        if media_id:
            MediaStorageService(self.session).delete_if_unreferenced(media_id, organization_id)
        self.session.commit()

    def reorder(self, organization_id: str, user_id: str, ordered_ids: list[str]) -> None:
        from app.shared.errors.application_errors import ReorderIdsMismatchError

        existing_ids = {
            ad.id for ad in self.ads.list(organization_id)
        }
        if set(ordered_ids) != existing_ids:
            raise ReorderIdsMismatchError()
        updated = assign_ordered_display_orders(
            self.session, ClientAdItem, organization_id, "ad", ordered_ids
        )
        if updated != len(ordered_ids):
            raise ReorderIdsMismatchError()
        self._record(
            organization_id, user_id, "ad", "Ads reordered"
        )
        self.session.commit()

    def _validate_ad(self, payload: AdItemRequest) -> None:
        validate_availability_window(payload.available_from, payload.available_until)
        validate_rotation_animation(payload.rotation_animation)
        if payload.is_active and not payload.source_reference:
            raise ValueError("Active ads require a source reference.")

    def _validate_uploaded_ad(self, payload: AdItemRequest) -> None:
        validate_availability_window(payload.available_from, payload.available_until)
        validate_rotation_animation(payload.rotation_animation)

    def _record(
        self,
        organization_id: str,
        user_id: str,
        entity_type: str,
        message: str,
        entity_id: str | None = None,
        event_type: str = "ad_changed"
    ) -> None:
        DisplayEventRepository(self.session).record(
            create_display_event(
                organization_id=organization_id,
                event_type=event_type,
                severity="info",
                message=message,
                entity_type=entity_type,
                entity_id=entity_id,
                created_by_user_id=user_id
            )
        )
