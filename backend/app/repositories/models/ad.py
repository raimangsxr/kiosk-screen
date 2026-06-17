from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.repositories.base import Base, IdMixin, TimestampMixin


class ClientAdItem(IdMixin, TimestampMixin, Base):
    __tablename__ = "client_ad_items"
    __table_args__ = (
        CheckConstraint("display_order > 0", name="ck_client_ads_display_order_positive"),
        CheckConstraint("duration_seconds IS NULL OR duration_seconds > 0", name="ck_client_ads_duration_positive"),
        CheckConstraint("animation_duration_milliseconds IS NULL OR animation_duration_milliseconds > 0", name="ck_client_ads_animation_duration_positive"),
    )

    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id"), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    source_reference: Mapped[str] = mapped_column(String(1024), nullable=False)
    media_file_id: Mapped[str | None] = mapped_column(ForeignKey("media_file_references.id"), nullable=True)
    media_file: Mapped[object | None] = relationship("MediaFileReference")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rotation_animation: Mapped[str | None] = mapped_column(String(16), nullable=True)
    animation_duration_milliseconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    available_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    available_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
