"""Public content upload route (spec 009 US1).

Auth: bearer API key (FR-001, FR-002).
Behavior: appends a new TopContentItem to the organization's rotation (FR-010..FR-013),
records a content_changed DisplayEvent (FR-014), and updates the API key's
last_used_at (FR-015).
"""
from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.orm import Session

from app.api.mappers import to_content_schema
from app.api.schemas import ContentItemSchema
from app.api.v1.public_content.schemas import parse_public_upload
from app.auth.dependencies import ApiKeyPrincipal, get_api_key_principal
from app.repositories.session import get_session
from app.services.content_service import ContentService

router = APIRouter(prefix="/content", tags=["Public Content"])


@router.post("/upload", response_model=ContentItemSchema, status_code=status.HTTP_201_CREATED)
async def upload_public_content(
    file: UploadFile | None = File(default=None),
    title: str = Form(""),
    principal: ApiKeyPrincipal = Depends(get_api_key_principal),
    session: Session = Depends(get_session),
) -> ContentItemSchema:
    # File and title are validated by parse_public_upload so the missing-file and
    # empty-title cases return our typed errors (400 file_required / title_required)
    # rather than FastAPI's default 422 with its own shape.
    validated_file, validated_title = parse_public_upload(file=file, title=title)
    item = ContentService(session).append_via_public_api(
        organization_id=principal.organization_id,
        api_key_id=principal.id,
        upload=validated_file,
        title=validated_title,
    )
    session.refresh(item, attribute_names=["media_file"])
    from app.application.display_orchestrator.hooks import notify_content_mutated

    notify_content_mutated(principal.organization_id)
    return to_content_schema(item)