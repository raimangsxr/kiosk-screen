from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.schemas import ReadinessReportSchema
from app.auth.dependencies import CurrentUser, get_current_user
from app.repositories.session import get_session
from app.services.readiness_service import ReadinessService

router = APIRouter(prefix="/readiness", tags=["Readiness"])


@router.get("", response_model=ReadinessReportSchema)
def readiness(user: CurrentUser = Depends(get_current_user), session: Session = Depends(get_session)) -> ReadinessReportSchema:
    result = ReadinessService(session).evaluate(user.organization_id)
    return ReadinessReportSchema(ready=result.ready, blockers=result.blockers, warnings=result.warnings)
