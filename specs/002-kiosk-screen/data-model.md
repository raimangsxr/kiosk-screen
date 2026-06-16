# Data Model: Kiosk Screen Content and Ads

## Organization

Represents the single owner of all first-release data.

**Fields**
- `id`: Unique organization identifier.
- `name`: Human-readable organization name.
- `created_at`, `updated_at`: Audit timestamps.

**Relationships**
- Owns users, role assignments, kiosk configuration, clients, content, ads,
  approved domains, display events, and sessions.

## User

Represents a person who can authenticate and perform role-permitted actions.

**Fields**
- `id`: Unique user identifier.
- `organization_id`: Owning organization.
- `email`: Unique login identifier within the organization.
- `display_name`: User-facing name.
- `password_hash`: Hashed password credential.
- `is_active`: Whether login is allowed.
- `created_at`, `updated_at`: Audit timestamps.

**Validation Rules**
- Email must be unique within the organization.
- Inactive users cannot authenticate.
- Passwords are never stored in plaintext.

## RoleAssignment

Represents allowed actions for a user.

**Fields**
- `id`: Unique role assignment identifier.
- `organization_id`: Owning organization.
- `user_id`: Assigned user.
- `role`: One of `display_viewer`, `event_operator`, `content_manager`,
  `advertising_manager`, `administrator`.
- `created_at`, `updated_at`: Audit timestamps.

**Validation Rules**
- Role value must be one of the approved MVP roles.
- A user may have multiple roles.

## KioskDisplayConfiguration

Defines the single kiosk display configuration for the MVP.

**Fields**
- `id`: Unique configuration identifier.
- `organization_id`: Owning organization.
- `name`: Display name.
- `is_enabled`: Whether the configuration can be opened.
- `top_region_ratio`: Fixed at `4`.
- `bottom_region_ratio`: Fixed at `1`.
- `default_top_duration_seconds`: Default duration for static top content.
- `default_ad_duration_seconds`: Default duration for ads.
- `configured_event_duration_minutes`: Required before live display starts.
- `created_at`, `updated_at`: Audit timestamps.

**Validation Rules**
- Exactly one active configuration exists for the first release.
- Event duration is required before the live display can be opened.
- Region ratio remains 4:1.

## TopContentItem

Represents a photo, video, or embedded web content item for the top region.

**Fields**
- `id`: Unique content identifier.
- `organization_id`: Owning organization.
- `title`: Manager-facing label.
- `content_type`: One of `photo`, `video`, `embedded_web`.
- `source_reference`: URL or storage reference for the content.
- `approved_domain_id`: Required for embedded web content.
- `is_active`: Whether the item can appear.
- `display_order`: Deterministic rotation order.
- `duration_seconds`: Optional item-specific duration.
- `available_from`, `available_until`: Optional availability window.
- `created_by_user_id`, `updated_by_user_id`: Audit user references.
- `created_at`, `updated_at`: Audit timestamps.

**Validation Rules**
- Embedded web content must reference an approved domain.
- Active items require a valid source reference.
- Active items require a deterministic display order.
- Duration must be positive when provided.
- Availability end must be after availability start when both are present.

**State Transitions**
- Draft/inactive -> active when validation passes.
- Active -> inactive when disabled, unavailable, removed from rotation, or
  outside availability.

## Client

Represents a client whose advertisement appears in the bottom region.

**Fields**
- `id`: Unique client identifier.
- `organization_id`: Owning organization.
- `name`: Client display/management name.
- `is_active`: Whether the client can have active ads.
- `created_at`, `updated_at`: Audit timestamps.

## ClientAdItem

Represents a client advertisement for the bottom region.

**Fields**
- `id`: Unique ad identifier.
- `organization_id`: Owning organization.
- `client_id`: Owning client.
- `label`: Manager-facing ad label.
- `source_reference`: URL or storage reference for the ad media.
- `is_active`: Whether the ad can appear.
- `display_order`: Deterministic rotation order.
- `duration_seconds`: Optional item-specific duration.
- `available_from`, `available_until`: Optional availability window.
- `created_by_user_id`, `updated_by_user_id`: Audit user references.
- `created_at`, `updated_at`: Audit timestamps.

**Validation Rules**
- Active ads require an active client.
- Active ads require a valid source reference.
- Active ads require a deterministic display order.
- Duration must be positive when provided.
- Availability end must be after availability start when both are present.

## ApprovedEmbeddedDomain

Represents a domain authorized by an administrator for embedded top content.

**Fields**
- `id`: Unique domain identifier.
- `organization_id`: Owning organization.
- `domain`: Approved domain name.
- `is_active`: Whether new embedded content may use the domain.
- `approved_by_user_id`: Administrator who approved it.
- `created_at`, `updated_at`: Audit timestamps.

**Validation Rules**
- Domain must be unique within the organization.
- Inactive domains prevent new content activation but do not delete historical
  references.

## AvailabilityWindow

Availability is stored on content and ad items through `available_from` and
`available_until`. A separate entity is not required for MVP because each item
has at most one optional window.

## OperatorSession

Represents the authenticated session used to open a live display.

**Fields**
- `id`: Unique session identifier.
- `organization_id`: Owning organization.
- `user_id`: Authenticated operator or administrator.
- `display_configuration_id`: Kiosk configuration opened by the session.
- `valid_until`: At least the configured event duration from display start.
- `created_at`: Session creation timestamp.
- `ended_at`: Optional explicit end timestamp.

**Validation Rules**
- User must have `event_operator` or `administrator` role.
- `valid_until` must cover the configured event duration.

## DisplayEvent

Represents operational events and diagnostics.

**Fields**
- `id`: Unique event identifier.
- `organization_id`: Owning organization.
- `event_type`: Categorized event such as `display_opened`,
  `content_changed`, `ad_changed`, `readiness_warning`, `load_failure`,
  `fallback_activated`, `domain_changed`, or `auth_denied`.
- `entity_type`: Optional related entity type.
- `entity_id`: Optional related entity identifier.
- `severity`: `info`, `warning`, or `error`.
- `message`: Human-readable diagnostic summary.
- `metadata`: Structured non-sensitive details.
- `created_by_user_id`: Optional triggering user.
- `created_at`: Event timestamp.

**Validation Rules**
- Event metadata must not store secrets or sensitive credentials.

## Readiness Rules

A display is ready when:

- The display configuration is enabled.
- A configured event duration exists.
- At least one active top content item is currently eligible.
- At least one active ad item is currently eligible.
- Active embedded content uses active approved domains.
- Active items have deterministic display order and valid durations.
- Invalid or unavailable sources are reported as readiness blockers or warnings.
