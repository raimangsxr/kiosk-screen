from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.repositories.models.client import Client
from app.repositories.models.ad import ClientAdItem


class ClientRepository:
    def __init__(self, session: Session):
        self.session = session

    def list(self, organization_id: str) -> list[Client]:
        return list(self.session.scalars(select(Client).where(Client.organization_id == organization_id).order_by(Client.name)))

    def get(self, organization_id: str, client_id: str) -> Client | None:
        return self.session.scalar(select(Client).where(Client.organization_id == organization_id, Client.id == client_id))

    def add(self, client: Client) -> Client:
        self.session.add(client)
        return client

    def has_active_ads(self, organization_id: str, client_id: str) -> bool:
        statement = select(func.count(ClientAdItem.id)).where(
            ClientAdItem.organization_id == organization_id,
            ClientAdItem.client_id == client_id,
            ClientAdItem.is_active.is_(True)
        )
        return (self.session.scalar(statement) or 0) > 0

    def delete(self, client: Client) -> None:
        self.session.delete(client)
