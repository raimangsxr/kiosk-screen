from sqlalchemy import select
from sqlalchemy.orm import Session

from app.repositories.base import utc_now
from app.repositories.models.display_device import DisplayDevice


class DisplayDeviceRepository:
    def __init__(self, session: Session):
        self.session = session

    def list_for_organization(self, organization_id: str) -> list[DisplayDevice]:
        return list(
            self.session.scalars(
                select(DisplayDevice)
                .where(DisplayDevice.organization_id == organization_id)
                .order_by(DisplayDevice.label.asc())
            )
        )

    def get(self, organization_id: str, device_id: str) -> DisplayDevice | None:
        return self.session.scalar(
            select(DisplayDevice).where(
                DisplayDevice.organization_id == organization_id,
                DisplayDevice.id == device_id,
            )
        )

    def get_by_label(self, organization_id: str, label: str) -> DisplayDevice | None:
        return self.session.scalar(
            select(DisplayDevice).where(
                DisplayDevice.organization_id == organization_id,
                DisplayDevice.label == label,
            )
        )

    def upsert_by_label(self, organization_id: str, label: str) -> DisplayDevice:
        device = self.get_by_label(organization_id, label)
        now = utc_now()
        if device is None:
            device = DisplayDevice(organization_id=organization_id, label=label, last_seen_at=now)
            self.session.add(device)
            return device
        device.last_seen_at = now
        return device

    def create(self, organization_id: str, label: str) -> DisplayDevice:
        device = DisplayDevice(organization_id=organization_id, label=label, last_seen_at=None)
        self.session.add(device)
        return device

    def delete(self, device: DisplayDevice) -> None:
        self.session.delete(device)
