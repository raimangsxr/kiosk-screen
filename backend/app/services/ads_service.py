from sqlalchemy.orm import Session

from app.api.schemas import AdItemRequest, ClientRequest
from app.domain.availability import validate_availability_window
from app.domain.display_events import create_display_event
from app.repositories.ads import AdRepository
from app.repositories.clients import ClientRepository
from app.repositories.events import DisplayEventRepository
from app.repositories.models.ad import ClientAdItem
from app.repositories.models.client import Client


class AdsService:
    def __init__(self, session: Session):
        self.session = session
        self.clients = ClientRepository(session)
        self.ads = AdRepository(session)

    def list_clients(self, organization_id: str) -> list[Client]:
        return self.clients.list(organization_id)

    def create_client(self, organization_id: str, user_id: str, payload: ClientRequest) -> Client:
        client = Client(organization_id=organization_id, name=payload.name, is_active=payload.is_active)
        self.clients.add(client)
        self._record(organization_id, user_id, "client", "Client changed")
        self.session.commit()
        return client

    def list_ads(self, organization_id: str) -> list[ClientAdItem]:
        return self.ads.list(organization_id)

    def get_ad(self, organization_id: str, ad_id: str) -> ClientAdItem:
        ad = self.ads.get(organization_id, ad_id)
        if ad is None:
            raise LookupError("Ad not found.")
        return ad

    def create_ad(self, organization_id: str, user_id: str, payload: AdItemRequest) -> ClientAdItem:
        self._validate_ad(organization_id, payload)
        ad = ClientAdItem(
            organization_id=organization_id,
            client_id=str(payload.client_id),
            label=payload.label,
            source_reference=payload.source_reference,
            is_active=payload.is_active,
            display_order=payload.display_order,
            duration_seconds=payload.duration_seconds,
            available_from=payload.available_from,
            available_until=payload.available_until,
            created_by_user_id=user_id,
            updated_by_user_id=user_id
        )
        self.ads.add(ad)
        self._record(organization_id, user_id, "ad", "Ad changed")
        self.session.commit()
        return ad

    def update_ad(self, organization_id: str, user_id: str, ad_id: str, payload: AdItemRequest) -> ClientAdItem:
        ad = self.get_ad(organization_id, ad_id)
        self._validate_ad(organization_id, payload)
        ad.client_id = str(payload.client_id)
        ad.label = payload.label
        ad.source_reference = payload.source_reference
        ad.is_active = payload.is_active
        ad.display_order = payload.display_order
        ad.duration_seconds = payload.duration_seconds
        ad.available_from = payload.available_from
        ad.available_until = payload.available_until
        ad.updated_by_user_id = user_id
        self._record(organization_id, user_id, "ad", "Ad changed", ad.id)
        self.session.commit()
        return ad

    def delete_ad(self, organization_id: str, user_id: str, ad_id: str) -> None:
        ad = self.get_ad(organization_id, ad_id)
        self.ads.delete(ad)
        self._record(organization_id, user_id, "ad", "Ad removed", ad_id)
        self.session.commit()

    def _validate_ad(self, organization_id: str, payload: AdItemRequest) -> None:
        validate_availability_window(payload.available_from, payload.available_until)
        client = self.clients.get(organization_id, str(payload.client_id))
        if client is None:
            raise ValueError("Ad client does not exist.")
        if payload.is_active and not client.is_active:
            raise ValueError("Active ads require an active client.")
        if payload.is_active and not payload.source_reference:
            raise ValueError("Active ads require a source reference.")

    def _record(self, organization_id: str, user_id: str, entity_type: str, message: str, entity_id: str | None = None) -> None:
        DisplayEventRepository(self.session).record(
            create_display_event(
                organization_id=organization_id,
                event_type="ad_changed",
                severity="info",
                message=message,
                entity_type=entity_type,
                entity_id=entity_id,
                created_by_user_id=user_id
            )
        )
