from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.repositories.base import Base, IdMixin, TimestampMixin


class DisplayControlState(IdMixin, TimestampMixin, Base):
    __tablename__ = "display_control_states"
    __table_args__ = (
        CheckConstraint("content_mode IN ('loop', 'iframe')", name="ck_display_control_content_mode"),
        UniqueConstraint("display_session_id", name="uq_display_control_state_session"),
    )

    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    display_session_id: Mapped[str] = mapped_column(ForeignKey("operator_sessions.id"), nullable=False)
    content_mode: Mapped[str] = mapped_column(String(16), nullable=False, default="loop")
    selected_iframe_id: Mapped[str | None] = mapped_column(ForeignKey("iframes.id", ondelete="SET NULL"), nullable=True)
    ads_visible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    fullscreen_requested: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    navigation_command: Mapped[str | None] = mapped_column(String(16), nullable=True)
    navigation_command_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    updated_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
