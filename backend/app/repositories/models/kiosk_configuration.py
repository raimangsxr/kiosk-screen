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
        CheckConstraint("default_top_animation_duration_milliseconds > 0", name="ck_kiosk_top_animation_duration_positive"),
        CheckConstraint("default_ad_animation_duration_milliseconds > 0", name="ck_kiosk_ad_animation_duration_positive"),
        CheckConstraint("inline_ad_count > 0", name="ck_kiosk_inline_ad_count_positive"),
        CheckConstraint(
            "remote_control_polling_seconds >= 1 AND remote_control_polling_seconds <= 60",
            name="ck_kiosk_remote_control_polling_range",
        ),
        CheckConstraint(
            "video_end_delay_seconds >= 0 AND video_end_delay_seconds <= 30",
            name="ck_kiosk_video_end_delay_range",
        ),
    )

    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    top_region_ratio: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    bottom_region_ratio: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    default_top_duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    default_ad_duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    default_top_rotation_animation: Mapped[str] = mapped_column(String(16), nullable=False, default="none")
    default_ad_rotation_animation: Mapped[str] = mapped_column(String(16), nullable=False, default="none")
    default_top_animation_duration_milliseconds: Mapped[int] = mapped_column(Integer, nullable=False, default=300)
    default_ad_animation_duration_milliseconds: Mapped[int] = mapped_column(Integer, nullable=False, default=300)
    inline_ad_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    remote_control_polling_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    video_end_delay_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=2, server_default="2")
