from decimal import Decimal

from sqlalchemy import ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.repositories.base import Base, IdMixin, TimestampMixin

DEFAULT_IFRAME_SCALE = Decimal("1.00")
MIN_IFRAME_SCALE = Decimal("0.10")
MAX_IFRAME_SCALE = Decimal("5.00")


class Iframe(IdMixin, TimestampMixin, Base):
    __tablename__ = "iframes"
    __table_args__ = (
        UniqueConstraint("organization_id", "url", name="uq_iframes_organization_id_url"),
        Index("ix_iframes_organization_id", "organization_id"),
    )

    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    scale_x: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False, default=DEFAULT_IFRAME_SCALE)
    scale_y: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False, default=DEFAULT_IFRAME_SCALE)
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
