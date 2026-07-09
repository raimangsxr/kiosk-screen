from sqlalchemy.orm import Session

from app.repositories.base import utc_now
from app.repositories.models.kiosk_connection import KioskConnection


class KioskConnectionRepository:
    def __init__(self, session: Session):
        self.session = session

    def record_connected(
        self,
        *,
        kiosk_id: str,
        organization_id: str,
        operator_session_id: str,
        client_instance_id: str,
        label: str | None,
    ) -> KioskConnection:
        now = utc_now()
        row = self.session.get(KioskConnection, kiosk_id)
        if row is None:
            row = KioskConnection(
                id=kiosk_id,
                organization_id=organization_id,
                operator_session_id=operator_session_id,
                client_instance_id=client_instance_id,
                label=label,
                connected_at=now,
                last_heartbeat_at=now,
            )
            self.session.add(row)
            return row

        row.organization_id = organization_id
        row.operator_session_id = operator_session_id
        row.client_instance_id = client_instance_id
        row.label = label
        row.connected_at = now
        row.disconnected_at = None
        row.last_heartbeat_at = now
        return row

    def record_disconnected(self, kiosk_id: str) -> None:
        row = self.session.get(KioskConnection, kiosk_id)
        if row is None:
            return
        now = utc_now()
        row.disconnected_at = now
        row.last_heartbeat_at = now
