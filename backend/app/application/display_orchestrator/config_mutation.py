from __future__ import annotations

from app.api.schemas import KioskConfigurationSchema

IMMEDIATE_LAYOUT_FIELDS = frozenset({
    "topRegionRatio",
    "bottomRegionRatio",
    "inlineAdItemBorderRadiusPx",
    "inlineAdItemBorderWidthPx",
    "inlineAdItemBorderColor",
})

DEFERRED_BOUNDARY_FIELDS = frozenset({
    "defaultTopDurationSeconds",
    "defaultAdDurationSeconds",
    "defaultTopRotationAnimation",
    "defaultAdRotationAnimation",
    "defaultTopAnimationDurationMilliseconds",
    "defaultAdAnimationDurationMilliseconds",
    "inlineAdCount",
    "videoEndDelaySeconds",
    "remoteControlPollingSeconds",
    "name",
    "isEnabled",
})


def diff_configuration_fields(
    before: KioskConfigurationSchema,
    after: KioskConfigurationSchema,
) -> list[str]:
    before_values = before.model_dump(mode="json", by_alias=True)
    after_values = after.model_dump(mode="json", by_alias=True)
    return [
        field
        for field in after_values
        if before_values.get(field) != after_values.get(field)
    ]


def build_config_updated_payload(
    before: KioskConfigurationSchema,
    after: KioskConfigurationSchema,
) -> dict:
    changed_fields = diff_configuration_fields(before, after)
    after_values = after.model_dump(mode="json", by_alias=True)
    partial_configuration: dict = {"id": after_values["id"]}
    for field in changed_fields:
        partial_configuration[field] = after_values[field]
    apply_immediately = any(field in IMMEDIATE_LAYOUT_FIELDS for field in changed_fields)
    return {
        "configuration": partial_configuration,
        "applyImmediately": apply_immediately,
        "changedFields": changed_fields,
    }
