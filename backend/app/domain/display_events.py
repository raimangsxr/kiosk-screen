from dataclasses import dataclass, field
from datetime import datetime

from app.repositories.base import new_id, utc_now

SECRET_KEYS = {"password", "token", "secret", "session"}


@dataclass(frozen=True)
class DisplayEventRecord:
    id: str
    organization_id: str
    event_type: str
    severity: str
    message: str
    entity_type: str | None = None
    entity_id: str | None = None
    metadata: dict[str, object] = field(default_factory=dict)
    created_by_user_id: str | None = None
    created_at: datetime = field(default_factory=utc_now)


def sanitize_metadata(metadata: dict[str, object] | None) -> dict[str, object]:
    clean: dict[str, object] = {}
    for key, value in (metadata or {}).items():
        if key.lower() in SECRET_KEYS:
            continue
        clean[key] = value
    return clean


def create_display_event(
    organization_id: str,
    event_type: str,
    severity: str,
    message: str,
    metadata: dict[str, object] | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    created_by_user_id: str | None = None
) -> DisplayEventRecord:
    return DisplayEventRecord(
        id=new_id(),
        organization_id=organization_id,
        event_type=event_type,
        severity=severity,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata=sanitize_metadata(metadata),
        created_by_user_id=created_by_user_id
    )


def create_api_key_event(
    organization_id: str,
    api_key_id: str,
    action: str,
    key_label: str,
    created_by_user_id: str | None = None,
) -> DisplayEventRecord:
    if action not in {"create", "rotate", "revoke"}:
        raise ValueError(f"Unknown api-key action: {action!r}")
    severity = "warning" if action == "revoke" else "info"
    return create_display_event(
        organization_id=organization_id,
        event_type="api_key_changed",
        severity=severity,
        message=f"API key {action}: {key_label}",
        entity_type="api_key",
        entity_id=api_key_id,
        created_by_user_id=created_by_user_id,
        metadata={"action": action, "key_label": key_label},
    )

