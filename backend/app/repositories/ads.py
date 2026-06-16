from sqlalchemy import select
from sqlalchemy.orm import Session

from app.repositories.models.ad import ClientAdItem


class AdRepository:
    def __init__(self, session: Session):
        self.session = session

    def list(self, organization_id: str) -> list[ClientAdItem]:
        return list(self.session.scalars(
            select(ClientAdItem)
            .where(ClientAdItem.organization_id == organization_id)
            .order_by(ClientAdItem.display_order)
        ))

    def get(self, organization_id: str, ad_id: str) -> ClientAdItem | None:
        return self.session.scalar(select(ClientAdItem).where(ClientAdItem.organization_id == organization_id, ClientAdItem.id == ad_id))

    def add(self, ad: ClientAdItem) -> ClientAdItem:
        self.session.add(ad)
        return ad

    def delete(self, ad: ClientAdItem) -> None:
        self.session.delete(ad)
