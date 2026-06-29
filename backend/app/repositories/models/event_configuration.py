from sqlalchemy import JSON, CheckConstraint, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.repositories.base import Base, IdMixin, TimestampMixin


class EventConfiguration(IdMixin, TimestampMixin, Base):
    __tablename__ = "event_configurations"
    __table_args__ = (
        CheckConstraint("event_duration_minutes > 0", name="ck_event_duration_minutes_positive"),
        CheckConstraint("event_duration_minutes <= 1440", name="ck_event_duration_minutes_max"),
        UniqueConstraint("organization_id", name="uq_event_configurations_organization_id"),
    )

    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    event_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    organizer_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    organizer_logo_media_id: Mapped[str | None] = mapped_column(
        ForeignKey("media_file_references.id", ondelete="SET NULL"),
        nullable=True,
    )
    organizer_logo_media: Mapped[object | None] = relationship("MediaFileReference")
    event_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=240)
    logo_layout: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    event_name_layout: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
