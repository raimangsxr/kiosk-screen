from sqlalchemy import select
from sqlalchemy.orm import Session

from app.repositories.models.content import TopContentItem


class ContentRepository:
    def __init__(self, session: Session):
        self.session = session

    def list(self, organization_id: str) -> list[TopContentItem]:
        return list(self.session.scalars(
            select(TopContentItem)
            .where(TopContentItem.organization_id == organization_id)
            .order_by(TopContentItem.display_order)
        ))

    def get(self, organization_id: str, content_id: str) -> TopContentItem | None:
        return self.session.scalar(
            select(TopContentItem).where(
                TopContentItem.organization_id == organization_id,
                TopContentItem.id == content_id
            )
        )

    def add(self, item: TopContentItem) -> TopContentItem:
        self.session.add(item)
        return item

    def delete(self, item: TopContentItem) -> None:
        self.session.delete(item)
