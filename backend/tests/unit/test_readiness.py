from app.domain.readiness import ReadinessInput, evaluate_readiness


def test_readiness_reports_blockers_and_warnings():
    result = evaluate_readiness(
        ReadinessInput(
            configuration_enabled=True,
            event_duration_minutes=120,
            active_top_content_count=1,
            active_ad_count=0,
            invalid_sources=["https://example.com/missing.jpg"]
        )
    )

    assert result.ready is False
    assert "At least one active ad item is required." in result.blockers
    assert result.warnings == ["Source may be unavailable: https://example.com/missing.jpg"]


def test_readiness_reports_missing_media_warning():
    result = evaluate_readiness(
        ReadinessInput(
            configuration_enabled=True,
            event_duration_minutes=120,
            active_top_content_count=1,
            active_ad_count=1,
            invalid_sources=["Sample image"]
        )
    )

    assert result.ready is True
    assert result.warnings == ["Source may be unavailable: Sample image"]


def test_readiness_ignores_inactive_items():
    result = evaluate_readiness(
        ReadinessInput(
            configuration_enabled=True,
            event_duration_minutes=120,
            active_top_content_count=0,
            active_ad_count=0
        )
    )

    assert "At least one active top content item is required." in result.blockers
    assert "At least one active ad item is required." in result.blockers
    assert not any("unapproved" in b for b in result.blockers)
    assert result.warnings == []
