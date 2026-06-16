from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.display_events import DisplayEventRecord
from app.repositories.models.display_event import DisplayEvent


class DisplayEventRepository:
    def __init__(self, session: Session):
        self.session = session

    def record(self, event: DisplayEventRecord) -> DisplayEvent:
        row = DisplayEvent(
            id=event.id,
            organization_id=event.organization_id,
            event_type=event.event_type,
            severity=event.severity,
            message=event.message,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            event_metadata=event.metadata,
            created_by_user_id=event.created_by_user_id,
            created_at=event.created_at
        )
        self.session.add(row)
        return row

    def list_recent(self, organization_id: str, limit: int = 50) -> list[DisplayEvent]:
        statement = (
            select(DisplayEvent)
            .where(DisplayEvent.organization_id == organization_id)
            .order_by(DisplayEvent.created_at.desc())
            .limit(limit)
        )
        return list(self.session.scalars(statement))

