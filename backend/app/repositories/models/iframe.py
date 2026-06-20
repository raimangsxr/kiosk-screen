from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.repositories.base import Base, IdMixin, TimestampMixin


class Iframe(IdMixin, TimestampMixin, Base):
    __tablename__ = "iframes"
    __table_args__ = (
        UniqueConstraint("organization_id", "url", name="uq_iframes_organization_id_url"),
        Index("ix_iframes_organization_id", "organization_id"),
    )

    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
