from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.repositories.base import Base, IdMixin, TimestampMixin


class KioskDisplayConfiguration(IdMixin, TimestampMixin, Base):
    __tablename__ = "kiosk_display_configurations"
    __table_args__ = (
        CheckConstraint("top_region_ratio = 4", name="ck_kiosk_top_region_ratio"),
        CheckConstraint("bottom_region_ratio = 1", name="ck_kiosk_bottom_region_ratio"),
        CheckConstraint("default_top_duration_seconds > 0", name="ck_kiosk_top_duration_positive"),
        CheckConstraint("default_ad_duration_seconds > 0", name="ck_kiosk_ad_duration_positive"),
        CheckConstraint("configured_event_duration_minutes > 0", name="ck_kiosk_event_duration_positive"),
    )

    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    top_region_ratio: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    bottom_region_ratio: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    default_top_duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    default_ad_duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    configured_event_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)

