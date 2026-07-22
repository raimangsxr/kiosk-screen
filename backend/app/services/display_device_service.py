from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.repositories.display_devices import DisplayDeviceRepository
from app.repositories.kiosk_connections import KioskConnectionRepository
from app.repositories.models.display_device import DisplayDevice


class DisplayDeviceService:
    def __init__(self, session: Session):
        self.session = session
        self.devices = DisplayDeviceRepository(session)
        self.kiosk_connections = KioskConnectionRepository(session)

    def list_devices(self, organization_id: str) -> list[DisplayDevice]:
        return self.devices.list_for_organization(organization_id)

    def get_device(self, organization_id: str, device_id: str) -> DisplayDevice:
        device = self.devices.get(organization_id, device_id)
        if device is None:
            raise LookupError("Display device not found.")
        return device

    def create_device(self, organization_id: str, label: str) -> DisplayDevice:
        clean = label.strip()
        if not clean:
            raise ValueError("Display label is required.")
        if self.devices.get_by_label(organization_id, clean) is not None:
            raise ValueError("A display with this label already exists.")
        device = self.devices.create(organization_id, clean)
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise ValueError("A display with this label already exists.") from exc
        return device

    def rename_device(self, organization_id: str, device_id: str, label: str) -> DisplayDevice:
        clean = label.strip()
        if not clean:
            raise ValueError("Display label is required.")
        device = self.get_device(organization_id, device_id)
        existing = self.devices.get_by_label(organization_id, clean)
        if existing is not None and existing.id != device.id:
            raise ValueError("A display with this label already exists.")
        device.label = clean
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise ValueError("A display with this label already exists.") from exc
        return device

    def delete_device(self, organization_id: str, device_id: str) -> None:
        device = self.get_device(organization_id, device_id)
        self.kiosk_connections.clear_display_device_references(device.id)
        self.devices.delete(device)
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise ValueError(
                "No se puede eliminar la pantalla porque sigue referenciada por conexiones activas."
            ) from exc

    def upsert_on_register(self, organization_id: str, label: str) -> DisplayDevice:
        clean = label.strip()
        if not clean:
            raise ValueError("Display label is required.")
        device = self.devices.upsert_by_label(organization_id, clean)
        self.session.flush()
        return device
