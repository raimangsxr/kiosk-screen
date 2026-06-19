"""Admin API key management routes (spec 009 US2).

All endpoints require the administrator role (FR-018). Every mutation records
an ``api_key_changed`` ``DisplayEvent`` (FR-022A) via the ``create_api_key_event``
helper.

Endpoints:
- ``GET    /api/admin/api-keys`` — list (no raw value).
- ``POST   /api/admin/api-keys`` — create; returns raw value **once**.
- ``POST   /api/admin/api-keys/{id}/rotate`` — in-place; returns new raw value once.
- ``DELETE /api/admin/api-keys/{id}`` — revoke (idempotent 204).
"""
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.api.v1.api_keys.schemas import (
    ApiKeyRecordSchema,
    ApiKeyWithRawSecretSchema,
    CreateApiKeyRequest,
)
from app.auth.dependencies import CurrentUser, require_roles
from app.domain.display_events import create_api_key_event
from app.domain.roles import ADMIN_ROLES
from app.repositories.api_keys import ApiKeyRepository
from app.repositories.events import DisplayEventRepository
from app.repositories.session import get_session
from app.services.api_key_service import ApiKeyService
from app.shared.errors.application_errors import (
    ApiKeyNotFoundError,
    ApiKeyRevokedError,
)

router = APIRouter(prefix="/admin/api-keys", tags=["Admin API Keys"])


def _to_record(record) -> ApiKeyRecordSchema:
    return ApiKeyRecordSchema(
        id=record.id,
        label=record.label,
        keyPrefix=record.key_prefix,
        isActive=record.is_active,
        createdAt=record.created_at,
        lastRotatedAt=record.last_rotated_at,
        lastUsedAt=record.last_used_at,
        revokedAt=record.revoked_at,
        createdByUserId=record.created_by_user_id,
    )


def _to_with_raw(record, raw_key: str) -> ApiKeyWithRawSecretSchema:
    return ApiKeyWithRawSecretSchema(
        record=_to_record(record),
        rawKey=raw_key,
    )


@router.get("", response_model=list[ApiKeyRecordSchema])  # type: ignore[name-defined]
def list_api_keys(
    user: CurrentUser = Depends(require_roles(ADMIN_ROLES)),
    session: Session = Depends(get_session),
):
    service = ApiKeyService(ApiKeyRepository(session))
    records = service.list_for_organization(user.organization_id)
    return [_to_record(r) for r in records]


@router.post("", response_model=ApiKeyWithRawSecretSchema, status_code=status.HTTP_201_CREATED)
def create_api_key(
    payload: Annotated[CreateApiKeyRequest, Body(...)],
    user: CurrentUser = Depends(require_roles(ADMIN_ROLES)),
    session: Session = Depends(get_session),
):
    from app.shared.errors.application_errors import (
        MissingTitleError,
        TitleTooLongError,
    )

    # Validate label using the typed errors so the response envelope matches the
    # public endpoint's error shape.
    label = (payload.label or "").strip()
    if not label:
        raise MissingTitleError()
    if len(label) > 120:
        raise TitleTooLongError(120)

    service = ApiKeyService(ApiKeyRepository(session))
    try:
        record, raw = service.create(
            organization_id=user.organization_id,
            label=label,
            created_by_user_id=user.id,
        )
    except ValueError as exc:
        # Service-level guard (defense in depth). The HTTP path validates above;
        # this catches any future change in the service.
        message = str(exc).lower()
        if "label" in message and "required" in message:
            raise MissingTitleError() from exc
        if "label" in message and "120" in message:
            raise TitleTooLongError(120) from exc
        raise
    session.flush()
    event = create_api_key_event(
        organization_id=user.organization_id,
        api_key_id=record.id,
        action="create",
        key_label=record.label,
        created_by_user_id=user.id,
    )
    DisplayEventRepository(session).record(event)
    session.commit()
    return _to_with_raw(record, raw)


@router.post("/{key_id}/rotate", response_model=ApiKeyWithRawSecretSchema)
def rotate_api_key(
    key_id: Annotated[str, Path(...)],
    user: CurrentUser = Depends(require_roles(ADMIN_ROLES)),
    session: Session = Depends(get_session),
):
    service = ApiKeyService(ApiKeyRepository(session))
    try:
        record, raw = service.rotate(user.organization_id, key_id)
    except ApiKeyRevokedError:
        # Re-raise so the application error handler returns the safe envelope.
        raise
    if record is None:
        raise ApiKeyNotFoundError()
    session.flush()
    event = create_api_key_event(
        organization_id=user.organization_id,
        api_key_id=record.id,
        action="rotate",
        key_label=record.label,
        created_by_user_id=user.id,
    )
    DisplayEventRepository(session).record(event)
    session.commit()
    return _to_with_raw(record, raw)


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_api_key(
    key_id: Annotated[str, Path(...)],
    user: CurrentUser = Depends(require_roles(ADMIN_ROLES)),
    session: Session = Depends(get_session),
):
    repository = ApiKeyRepository(session)
    # Capture the pre-revoke state so the audit event is recorded only on
    # an actual isActive: true -> false transition (contract: idempotent
    # no-op calls do not create duplicate events).
    pre = repository.get_by_id(user.organization_id, key_id)
    if pre is None:
        raise ApiKeyNotFoundError()
    was_already_inactive = not pre.is_active

    service = ApiKeyService(repository)
    if not service.revoke(user.organization_id, key_id):
        raise ApiKeyNotFoundError()
    session.flush()
    if was_already_inactive:
        # No-op revoke; the contract specifies no audit event for the second call.
        return
    # Read back the record to record an audit event with the label.
    record = repository.get_by_id(user.organization_id, key_id)
    if record is not None:
        event = create_api_key_event(
            organization_id=user.organization_id,
            api_key_id=record.id,
            action="revoke",
            key_label=record.label,
            created_by_user_id=user.id,
        )
        DisplayEventRepository(session).record(event)
        session.commit()
