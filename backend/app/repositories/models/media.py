from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.repositories.base import Base, IdMixin, TimestampMixin


class MediaFileReference(IdMixin, TimestampMixin, Base):
    __tablename__ = "media_file_references"

    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    public_reference: Mapped[str] = mapped_column(String(1024), nullable=False, unique=True)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    media_type: Mapped[str] = mapped_column(String(16), nullable=False)
    content_type: Mapped[str] = mapped_column(String(128), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
