from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.repositories.base import Base, utc_now


class KioskConnection(Base):
    __tablename__ = "kiosk_connections"

    id: Mapped[str] = mapped_column(primary_key=True)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    operator_session_id: Mapped[str] = mapped_column(ForeignKey("operator_sessions.id"), nullable=False)
    client_instance_id: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str | None] = mapped_column(String(80), nullable=True)
    display_device_id: Mapped[str | None] = mapped_column(ForeignKey("display_devices.id"), nullable=True)
    connected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    disconnected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_heartbeat_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
