from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.repositories.base import Base, IdMixin, TimestampMixin


class DisplayDevice(IdMixin, TimestampMixin, Base):
    __tablename__ = "display_devices"
    __table_args__ = (
        UniqueConstraint("organization_id", "label", name="uq_display_devices_org_label"),
        Index("ix_display_devices_organization_id", "organization_id"),
    )

    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    label: Mapped[str] = mapped_column(String(80), nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
