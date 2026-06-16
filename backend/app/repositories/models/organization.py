from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.repositories.base import Base, IdMixin, TimestampMixin


class Organization(IdMixin, TimestampMixin, Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    users: Mapped[list["User"]] = relationship(back_populates="organization", cascade="all, delete-orphan")

