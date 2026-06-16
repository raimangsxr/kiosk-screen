from dataclasses import dataclass, field


@dataclass(frozen=True)
class ReadinessInput:
    configuration_enabled: bool
    event_duration_minutes: int | None
    active_top_content_count: int
    active_ad_count: int
    invalid_sources: list[str] = field(default_factory=list)
    unapproved_embedded_domains: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class ReadinessResult:
    ready: bool
    blockers: list[str]
    warnings: list[str]


def evaluate_readiness(data: ReadinessInput) -> ReadinessResult:
    blockers: list[str] = []
    warnings: list[str] = []

    if not data.configuration_enabled:
        blockers.append("Display configuration is disabled.")
    if not data.event_duration_minutes:
        blockers.append("Configured event duration is required.")
    if data.active_top_content_count < 1:
        blockers.append("At least one active top content item is required.")
    if data.active_ad_count < 1:
        blockers.append("At least one active ad item is required.")
    for domain in data.unapproved_embedded_domains:
        blockers.append(f"Embedded domain is not approved: {domain}")
    for source in data.invalid_sources:
        warnings.append(f"Source may be unavailable: {source}")

    return ReadinessResult(ready=not blockers, blockers=blockers, warnings=warnings)

