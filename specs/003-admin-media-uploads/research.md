# Research: Admin Media Uploads

## Decision: Store uploaded binaries on disk and metadata in PostgreSQL

**Rationale**: The specification requires uploaded files to be saved in a volume and the database to hold references and metadata. Keeping binaries in disk-backed storage and metadata in PostgreSQL preserves PostgreSQL as the application source of truth for data while avoiding large binary payloads in relational rows.

**Alternatives considered**:
- Store binaries in PostgreSQL: rejected because the spec explicitly calls for a volume/disk and because it complicates media serving and backup size.
- External object storage: rejected because external cloud storage is out of scope.

## Decision: Add a MediaFileReference entity

**Rationale**: A separate media reference entity supports shared references, reference-counted deletion, metadata for diagnostics, protected access decisions, and future-safe separation between uploaded files and content/ad records.

**Alternatives considered**:
- Store only file paths on content/ad rows: rejected because deletion semantics require knowing whether another item references the same uploaded file.
- Duplicate file metadata independently on each item: rejected because it increases consistency risk and makes cleanup less reliable.

## Decision: Use authenticated backend-controlled media URLs

**Rationale**: The clarified requirement states uploaded media URLs require authenticated access by an authorized app user or kiosk session. Backend-controlled media access keeps authorization, observability, and error handling at the same boundary as the rest of the application.

**Alternatives considered**:
- Public static file URLs: rejected because unauthenticated access must be denied.
- Signed URLs only: deferred because it introduces extra token lifecycle behavior not required for MVP.

## Decision: Extend existing content and ad APIs with upload-specific endpoints

**Rationale**: The current application already has content and ad services, repositories, and route groups. Upload behavior fits those domains while adding multipart file handling and storage coordination.

**Alternatives considered**:
- Single generic media upload endpoint plus separate attach calls: rejected for MVP because it creates extra user-visible failure states and complicates atomic save behavior.
- New independent media management module in the frontend: rejected because users manage uploads as content or ads, not as standalone media assets.

## Decision: Global defaults with optional per-item rotation overrides

**Rationale**: Clarification selected global defaults per content area with optional per-item overrides. This keeps configuration efficient while supporting longer videos or special ads.

**Alternatives considered**:
- Global-only rotation settings: rejected because some uploaded media may need distinct duration.
- Per-item-only settings: rejected because it creates unnecessary repeated work for common defaults.

## Decision: Enforce fixed MVP upload size limits

**Rationale**: Clarification selected images up to 25 MB and videos up to 500 MB. These limits make validation, tests, and error states explicit.

**Alternatives considered**:
- Smaller 10 MB/200 MB limits: rejected because event videos may reasonably exceed 200 MB.
- No product-defined limit: rejected because it increases storage and reliability risk.

## Decision: Reference-count cleanup on delete

**Rationale**: Clarification requires deleting uploaded files only when no remaining content or ad item references the file. Services must coordinate metadata deletion with safe file cleanup.

**Alternatives considered**:
- Always delete file on item deletion: rejected because it can break another item using the same file.
- Never delete files automatically: rejected because it creates unbounded orphaned storage.

## Decision: Keep animation options as a predefined set

**Rationale**: The approved MVP set is `none`, `fade`, and `slide`. This keeps UI simple, supports validation, and avoids arbitrary animation names creating inconsistent display behavior.

**Alternatives considered**:
- Free-form animation names: rejected because they are hard to validate and test.
- Advanced custom animation editor: out of scope.
