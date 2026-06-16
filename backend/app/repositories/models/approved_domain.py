from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.repositories.base import Base, IdMixin, TimestampMixin


class ApprovedEmbeddedDomain(IdMixin, TimestampMixin, Base):
    __tablename__ = "approved_embedded_domains"
    __table_args__ = (UniqueConstraint("organization_id", "domain", name="uq_approved_domains_organization_domain"),)

    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    domain: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    approved_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)

