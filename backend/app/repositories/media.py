from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.repositories.models.ad import ClientAdItem
from app.repositories.models.content import TopContentItem
from app.repositories.models.media import MediaFileReference


class MediaRepository:
    def __init__(self, session: Session):
        self.session = session

    def add(self, media: MediaFileReference) -> MediaFileReference:
        self.session.add(media)
        return media

    def get(self, organization_id: str, media_id: str) -> MediaFileReference | None:
        return self.session.scalar(
            select(MediaFileReference).where(
                MediaFileReference.organization_id == organization_id,
                MediaFileReference.id == media_id
            )
        )

    def find_accessible(self, media_id: str) -> MediaFileReference | None:
        return self.session.get(MediaFileReference, media_id)

    def reference_count(self, organization_id: str, media_id: str) -> int:
        content_count = self.session.scalar(
            select(func.count()).select_from(TopContentItem).where(
                TopContentItem.organization_id == organization_id,
                TopContentItem.media_file_id == media_id
            )
        ) or 0
        ad_count = self.session.scalar(
            select(func.count()).select_from(ClientAdItem).where(
                ClientAdItem.organization_id == organization_id,
                ClientAdItem.media_file_id == media_id
            )
        ) or 0
        return int(content_count) + int(ad_count)

    def delete_if_unreferenced(self, media: MediaFileReference) -> bool:
        if self.reference_count(media.organization_id, media.id) > 0:
            return False
        self.session.delete(media)
        return True
