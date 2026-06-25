import pytest
from pydantic import ValidationError

from app.api.schemas import KioskConfigurationRequest, KioskConfigurationSchema


def test_configuration_contract_includes_remote_control_polling_seconds() -> None:
    configuration = KioskConfigurationSchema(
        id="00000000-0000-0000-0000-000000000001",
        name="Main",
        topRegionRatio=5,
        bottomRegionRatio=1,
        defaultTopDurationSeconds=10,
        defaultAdDurationSeconds=8,
        configuredEventDurationMinutes=60,
        remoteControlPollingSeconds=3,
        isEnabled=True,
    )

    assert configuration.model_dump(by_alias=True)["remoteControlPollingSeconds"] == 3


def test_configuration_update_defaults_remote_control_polling_seconds() -> None:
    request = KioskConfigurationRequest(
        name="Main",
        defaultTopDurationSeconds=10,
        defaultAdDurationSeconds=8,
        configuredEventDurationMinutes=60,
        isEnabled=True,
    )

    assert request.remote_control_polling_seconds == 3


@pytest.mark.parametrize("value", [0, 61])
def test_configuration_update_rejects_polling_interval_outside_bounds(value: int) -> None:
    with pytest.raises(ValidationError):
        KioskConfigurationRequest(
            name="Main",
            defaultTopDurationSeconds=10,
            defaultAdDurationSeconds=8,
            configuredEventDurationMinutes=60,
            remoteControlPollingSeconds=value,
            isEnabled=True,
        )


def test_remote_control_contract_documents_state_update_and_iframe_options() -> None:
    from app.api.v1.display import schemas as v1_schemas

    assert hasattr(v1_schemas, "RemoteControlStateRead")
    assert hasattr(v1_schemas, "RemoteControlStateUpdate")
    assert hasattr(v1_schemas, "RemoteControlIframeOptionsRead")


def test_effective_display_state_contract_includes_remote_control_fields() -> None:
    from app.api.schemas import DisplayStateSchema

    payload = {
        "configuration": {
            "id": "00000000-0000-0000-0000-000000000001",
            "name": "Main",
            "topRegionRatio": 5,
            "bottomRegionRatio": 1,
            "defaultTopDurationSeconds": 10,
            "defaultAdDurationSeconds": 8,
            "configuredEventDurationMinutes": 60,
            "remoteControlPollingSeconds": 3,
            "isEnabled": True,
        },
        "topContent": [],
        "ads": [],
        "remoteControl": {
            "contentMode": "loop",
            "selectedContentId": None,
            "adsVisible": True,
            "updatedAt": "2026-06-18T00:00:00Z",
        },
        "selectedIframe": None,
        "fallbackActive": False,
    }

    state = DisplayStateSchema.model_validate(payload)
    dumped = state.model_dump(by_alias=True)

    assert dumped["remoteControl"]["contentMode"] == "loop"
    assert dumped["configuration"]["remoteControlPollingSeconds"] == 3
    assert dumped["selectedIframe"] is None
