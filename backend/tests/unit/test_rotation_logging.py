from __future__ import annotations

import logging

from app.application.display_orchestrator.rotation_logging import log_rotation_plan, log_rotation_replan
from app.application.display_orchestrator.rotation_plan import ContentRef, RotationPlanSnapshot


def test_log_rotation_plan_emits_structured_extra(caplog) -> None:
    caplog.set_level(logging.INFO)
    snapshot = RotationPlanSnapshot(
        showing=ContentRef(id="id-1", title="Item 1"),
        next=ContentRef(id="id-2", title="Item 2"),
        novelties=("id-n",),
        reason="rotation_advance",
    )

    log_rotation_plan(
        snapshot,
        organization_id="org-1",
        operator_session_id="session-1",
        reason="rotation_advance",
    )

    assert len(caplog.records) == 1
    record = caplog.records[0]
    assert record.message == "rotation_plan"
    assert record.organizationId == "org-1"  # type: ignore[attr-defined]
    assert record.operatorSessionId == "session-1"  # type: ignore[attr-defined]
    assert record.event == "rotation_plan"  # type: ignore[attr-defined]
    assert record.showing == {"id": "id-1", "title": "Item 1"}  # type: ignore[attr-defined]
    assert record.next == {"id": "id-2", "title": "Item 2"}  # type: ignore[attr-defined]
    assert record.novelties == ["id-n"]  # type: ignore[attr-defined]


def test_log_rotation_replan_emits_structured_extra(caplog) -> None:
    caplog.set_level(logging.INFO)
    snapshot = RotationPlanSnapshot(
        showing=ContentRef(id="id-3", title="Item 3"),
        next=ContentRef(id="id-250", title="Novelty"),
        novelties=("id-250",),
        reason="public_upload_replan",
    )

    log_rotation_replan(
        snapshot,
        organization_id="org-1",
        operator_session_id="session-1",
        reason="public_upload_replan",
    )

    assert caplog.records[0].message == "rotation_replan"
    assert caplog.records[0].event == "rotation_replan"  # type: ignore[attr-defined]
