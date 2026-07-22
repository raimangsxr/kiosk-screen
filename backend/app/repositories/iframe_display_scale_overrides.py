from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.repositories.models.iframe_display_scale_override import IframeDisplayScaleOverride


class IframeDisplayScaleOverrideRepository:
    def __init__(self, session: Session):
        self.session = session

    def get(self, display_device_id: str, iframe_id: str) -> IframeDisplayScaleOverride | None:
        return self.session.scalar(
            select(IframeDisplayScaleOverride).where(
                IframeDisplayScaleOverride.display_device_id == display_device_id,
                IframeDisplayScaleOverride.iframe_id == iframe_id,
            )
        )

    def list_for_iframe(self, iframe_id: str) -> list[IframeDisplayScaleOverride]:
        return list(
            self.session.scalars(
                select(IframeDisplayScaleOverride).where(IframeDisplayScaleOverride.iframe_id == iframe_id)
            )
        )

    def list_for_device(self, display_device_id: str) -> list[IframeDisplayScaleOverride]:
        return list(
            self.session.scalars(
                select(IframeDisplayScaleOverride).where(
                    IframeDisplayScaleOverride.display_device_id == display_device_id
                )
            )
        )

    def upsert(
        self,
        *,
        display_device_id: str,
        iframe_id: str,
        scale_x,
        scale_y,
    ) -> IframeDisplayScaleOverride:
        row = self.get(display_device_id, iframe_id)
        if row is None:
            row = IframeDisplayScaleOverride(
                display_device_id=display_device_id,
                iframe_id=iframe_id,
                scale_x=scale_x,
                scale_y=scale_y,
            )
            self.session.add(row)
            return row
        row.scale_x = scale_x
        row.scale_y = scale_y
        return row

    def clear(self, display_device_id: str, iframe_id: str) -> None:
        self.session.execute(
            delete(IframeDisplayScaleOverride).where(
                IframeDisplayScaleOverride.display_device_id == display_device_id,
                IframeDisplayScaleOverride.iframe_id == iframe_id,
            )
        )
