from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import SESSION_COOKIE_NAME
from app.repositories.base import utc_now
from app.repositories.media import MediaRepository
from app.repositories.models.operator_session import OperatorSession
from app.repositories.models.user import User
from app.repositories.session import get_session
from app.services.media_storage_service import MediaStorageService

router = APIRouter(prefix="/media", tags=["Media"])


def _authorized_organization_id(request: Request, session: Session) -> str | None:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return None

    session_user_id = getattr(request.app.state, "auth_sessions", {}).get(token)
    if session_user_id is not None:
        user = session.get(User, session_user_id)
        if user is not None and user.is_active:
            return user.organization_id

    operator_session = session.get(OperatorSession, token)
    if (
        operator_session is not None
        and operator_session.ended_at is None
        and operator_session.valid_until > utc_now()
    ):
        return operator_session.organization_id
    return None


@router.get("/{media_id}")
def get_media(media_id: str, request: Request, session: Session = Depends(get_session)) -> FileResponse:
    organization_id = _authorized_organization_id(request, session)
    if organization_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    media = MediaRepository(session).get(organization_id, media_id)
    if media is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media reference not found")

    path = MediaStorageService(session).absolute_path(media)
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media file not found")

    return FileResponse(path, media_type=media.content_type, filename=media.original_filename)
