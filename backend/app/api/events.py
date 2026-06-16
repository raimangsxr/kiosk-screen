from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.mappers import to_event_schema
from app.api.schemas import DisplayEventSchema
from app.auth.dependencies import CurrentUser, get_current_user
from app.repositories.events import DisplayEventRepository
from app.repositories.session import get_session

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("", response_model=list[DisplayEventSchema])
def list_events(user: CurrentUser = Depends(get_current_user), session: Session = Depends(get_session)) -> list[DisplayEventSchema]:
    return [to_event_schema(event) for event in DisplayEventRepository(session).list_recent(user.organization_id)]
