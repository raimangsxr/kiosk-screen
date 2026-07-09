from uuid import uuid4

from app.api.schemas import KioskConfigurationSchema
from app.application.display_orchestrator.config_mutation import (
    build_config_updated_payload,
    diff_configuration_fields,
)


def _configuration(**overrides) -> KioskConfigurationSchema:
    values = {
        "id": uuid4(),
        "name": "Main",
        "topRegionRatio": 5,
        "bottomRegionRatio": 1,
        "defaultTopDurationSeconds": 10,
        "defaultAdDurationSeconds": 8,
        "defaultTopRotationAnimation": "none",
        "defaultAdRotationAnimation": "none",
        "defaultTopAnimationDurationMilliseconds": 300,
        "defaultAdAnimationDurationMilliseconds": 300,
        "inlineAdCount": 2,
        "inlineAdItemBorderRadiusPx": 5,
        "inlineAdItemBorderWidthPx": 0,
        "inlineAdItemBorderColor": "#ffffff",
        "remoteControlPollingSeconds": 3,
        "videoEndDelaySeconds": 2,
        "isEnabled": True,
    }
    values.update(overrides)
    return KioskConfigurationSchema(**values)


def test_ratio_change_applies_immediately_with_partial_configuration() -> None:
    config_id = uuid4()
    before = _configuration(id=config_id)
    after = _configuration(id=config_id, topRegionRatio=7)

    payload = build_config_updated_payload(before, after)

    assert payload["applyImmediately"] is True
    assert payload["changedFields"] == ["topRegionRatio"]
    assert payload["configuration"] == {"id": str(after.id), "topRegionRatio": 7}


def test_inline_ad_count_change_defers_immediate_application() -> None:
    config_id = uuid4()
    before = _configuration(id=config_id)
    after = _configuration(id=config_id, inlineAdCount=4)

    payload = build_config_updated_payload(before, after)

    assert payload["applyImmediately"] is False
    assert payload["changedFields"] == ["inlineAdCount"]
    assert payload["configuration"]["inlineAdCount"] == 4


def test_mixed_ratio_and_inline_ad_count_marks_layout_immediate() -> None:
    config_id = uuid4()
    before = _configuration(id=config_id)
    after = _configuration(id=config_id, topRegionRatio=7, inlineAdCount=4)

    payload = build_config_updated_payload(before, after)

    assert payload["applyImmediately"] is True
    assert set(payload["changedFields"]) == {"topRegionRatio", "inlineAdCount"}
    assert diff_configuration_fields(before, after) == payload["changedFields"]
