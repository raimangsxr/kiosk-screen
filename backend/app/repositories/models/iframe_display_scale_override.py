from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.repositories.base import Base, IdMixin, TimestampMixin
from app.repositories.models.iframe import MAX_IFRAME_SCALE, MIN_IFRAME_SCALE


class IframeDisplayScaleOverride(IdMixin, TimestampMixin, Base):
    __tablename__ = "iframe_display_scale_overrides"
    __table_args__ = (
        UniqueConstraint("display_device_id", "iframe_id", name="uq_iframe_display_scale_device_iframe"),
    )

    display_device_id: Mapped[str] = mapped_column(ForeignKey("display_devices.id", ondelete="CASCADE"), nullable=False)
    iframe_id: Mapped[str] = mapped_column(ForeignKey("iframes.id", ondelete="CASCADE"), nullable=False)
    scale_x: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False, default=MIN_IFRAME_SCALE)
    scale_y: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False, default=MIN_IFRAME_SCALE)

    MIN_SCALE = MIN_IFRAME_SCALE
    MAX_SCALE = MAX_IFRAME_SCALE
