from uuid import uuid4

from app.api.schemas import KioskConfigurationSchema, UserSchema


def test_schemas_emit_openapi_camel_case_contract_fields():
    user = UserSchema(id=uuid4(), email="admin@example.com", displayName="Admin", roles=["administrator"])
    configuration = KioskConfigurationSchema(
        id=uuid4(),
        name="Main",
        topRegionRatio=4,
        bottomRegionRatio=1,
        defaultTopDurationSeconds=15,
        defaultAdDurationSeconds=10,
        configuredEventDurationMinutes=120,
        isEnabled=True
    )

    assert user.model_dump(by_alias=True)["displayName"] == "Admin"
    assert configuration.model_dump(by_alias=True)["topRegionRatio"] == 4

