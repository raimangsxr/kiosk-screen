"""Contract tests for the v1 display module (T086).

The refactor split the original ``app/api/display.py`` into a v1 module at
``app/api/v1/display/`` while preserving the response shape. These tests
verify the contract still holds end-to-end via the FastAPI app and the
underlying services.
"""

import pytest


@pytest.fixture
def display_state_shape():
    return {
        "configuration",
        "topContent",
        "ads",
        "fallbackActive",
    }


def test_v1_display_routes_compose_into_v1_router():
    from app.api.v1.display import routes as v1_routes

    assert hasattr(v1_routes, "display_router")
    assert hasattr(v1_routes, "configuration_router")


def test_v1_display_schemas_re_exports_documented_models():
    from app.api.v1.display import schemas as v1_schemas
    from app.api.schemas import (
        DisplayStateSchema,
        KioskConfigurationSchema,
        KioskConfigurationRequest,
    )

    assert v1_schemas.DisplayStateRead is DisplayStateSchema
    assert v1_schemas.KioskConfigurationRead is KioskConfigurationSchema
    assert v1_schemas.KioskConfigurationUpdate is KioskConfigurationRequest


def test_v1_application_display_facade_returns_documented_contract():
    from app.api.v1.display import routes as v1_routes
    from app.api.display import router as legacy_router

    assert v1_routes.display_router is legacy_router


def test_v1_display_state_response_uses_documented_field_names(display_state_shape):
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
            "isEnabled": True,
        },
        "topContent": [],
        "ads": [],
        "fallbackActive": False,
    }
    state = DisplayStateSchema.model_validate(payload)
    dumped = state.model_dump(by_alias=True)
    for field in display_state_shape:
        assert field in dumped, f"DisplayStateSchema must serialise {field}"


def test_v1_display_state_roundtrip_preserves_effective_fields():
    from app.api.schemas import DisplayStateSchema

    payload = {
        "configuration": {
            "id": "00000000-0000-0000-0000-000000000001",
            "name": "Main",
            "topRegionRatio": 5,
            "bottomRegionRatio": 1,
            "defaultTopDurationSeconds": 10,
            "defaultAdDurationSeconds": 8,
            "defaultTopRotationAnimation": "fade",
            "defaultAdRotationAnimation": "slide",
            "defaultTopAnimationDurationMilliseconds": 300,
            "defaultAdAnimationDurationMilliseconds": 300,
            "inlineAdCount": 2,
            "configuredEventDurationMinutes": 60,
            "isEnabled": True,
        },
        "topContent": [
            {
                "id": "00000000-0000-0000-0000-000000000010",
                "title": "Welcome",
                "contentType": "photo",
                "sourceReference": "https://example.com/welcome.jpg",
                "mediaFile": None,
                "approvedDomainId": None,
                "isActive": True,
                "displayOrder": 1,
                "durationSeconds": 15,
                "rotationAnimation": None,
                "animationDurationMilliseconds": None,
                "effectiveDurationSeconds": 15,
                "effectiveRotationAnimation": "fade",
                "effectiveAnimationDurationMilliseconds": 300,
                "availableFrom": None,
                "availableUntil": None,
            }
        ],
        "ads": [
            {
                "id": "00000000-0000-0000-0000-000000000020",
                "sourceReference": "https://example.com/ad.jpg",
                "mediaFile": None,
                "isActive": True,
                "displayOrder": 1,
                "durationSeconds": 10,
                "rotationAnimation": None,
                "animationDurationMilliseconds": None,
                "effectiveDurationSeconds": 10,
                "effectiveRotationAnimation": "slide",
                "effectiveAnimationDurationMilliseconds": 300,
                "availableFrom": None,
                "availableUntil": None,
                "advertiser": "Sponsor",
            }
        ],
        "fallbackActive": False,
    }

    state = DisplayStateSchema.model_validate(payload)
    dumped = state.model_dump(by_alias=True)
    assert dumped["fallbackActive"] is False
    assert dumped["topContent"][0]["effectiveDurationSeconds"] == 15
    assert dumped["ads"][0]["effectiveRotationAnimation"] == "slide"
    assert dumped["configuration"]["inlineAdCount"] == 2
