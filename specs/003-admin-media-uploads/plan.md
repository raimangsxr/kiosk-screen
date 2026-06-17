# Implementation Plan: Admin Media Uploads

**Branch**: `005-admin-media-uploads` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-admin-media-uploads/spec.md`

## Summary

Extend the existing kiosk Admin panel so authorized users can upload image and video files for main content, create iframe content entries, upload image ads, configure default and per-item rotation behavior, and display protected uploaded media through the kiosk. The implementation keeps Angular UI concerns in frontend modules, FastAPI route handlers thin, upload and rotation rules in backend services, persistence through SQLAlchemy and PostgreSQL, structural changes through Alembic, and API contracts documented through OpenAPI.

## Technical Context

**Language/Version**: TypeScript with Angular-supported TypeScript version; Python 3.12 for backend runtime and tooling

**Primary Dependencies**: Angular standalone components, Angular Router, Angular HTTP client, FastAPI, Pydantic, SQLAlchemy 2.x, Alembic, PostgreSQL driver, pytest, Angular-compatible test runner, container tooling

**Storage**: PostgreSQL remains the source of truth for metadata. Uploaded image and video files are saved to persistent disk-backed storage mounted into the backend runtime. Database records store references and metadata needed to load protected media.

**Testing**: pytest for backend unit, service, repository, API, contract, and migration tests; Angular-compatible unit/component tests for frontend behavior; browser or smoke validation for upload-to-display flows

**Target Platform**: Web browser for admin users and kiosk display; FastAPI backend running in containers; PostgreSQL database; persistent volume for uploaded media; Kubernetes deployment target

**Project Type**: Web application with separated Angular frontend and FastAPI backend packages in one repository

**Performance Goals**: Valid image or video upload with metadata completes in under 2 minutes; upload validation failures are shown before items become active; kiosk display rotates valid uploaded media without broken visual placeholders for a 30-minute session; unauthenticated direct media access is denied 100% of the time

**Constraints**: Use Angular, TypeScript, FastAPI, SQLAlchemy, Alembic, and PostgreSQL. Keep business logic outside FastAPI route handlers. Use Pydantic/FastAPI schemas for validation. Use Alembic for every schema change. Uploaded media limits are 25 MB per image and 500 MB per video. Media URLs require authenticated app user or kiosk session access. MVP rotation animations are limited to `none`, `fade`, and `slide`.

**Scale/Scope**: MVP extends the existing single-organization kiosk with admin/content/ad upload flows, protected local media storage, default rotation settings, optional per-item rotation overrides, and inline ad count configuration. Bulk upload, external cloud storage, media editing, transcoding, and analytics remain out of scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Spec traceability**: PASS. The plan maps to approved requirements FR-001 through FR-027 and success criteria SC-001 through SC-008.
- **Requirement clarity**: PASS. Clarifications resolved permissions, global versus item-level rotation behavior, file lifecycle, media access security, and upload size limits.
- **Plan alignment**: PASS. Technical approach follows the fixed stack and does not introduce another frontend framework, backend framework, database, or storage source of truth for metadata.
- **Simplicity**: PASS. The design extends existing content, ads, admin, display, service, repository, and migration boundaries rather than creating a parallel media subsystem.
- **Contracts**: PASS. New and changed backend APIs are documented in `contracts/openapi.yaml`; frontend integration uses those contracts.
- **Testing**: PASS. Backend service, API, repository, migration, contract, frontend component/service, and smoke validations are planned for changed behavior.
- **Security, observability, accessibility**: PASS. Role boundaries, protected media access, upload validation, storage error reporting, display load failures, and accessible admin form states are planned.
- **No speculative scope**: PASS. Bulk upload, cloud storage, transcoding, analytics, ad targeting, and media editing remain excluded.
- **Conflict handling**: PASS. If implementation reality conflicts with this plan or the approved spec, work stops until the conflict is documented and the spec or plan is updated.

## Proposed Architecture

The feature extends the existing three-layer architecture:

1. **Angular frontend**: Admin/content/ad forms gain upload controls, rotation fields, inline ad count settings, and clear validation/storage error states. Angular services handle upload and configuration requests. Components remain presentation-focused.
2. **FastAPI backend**: Upload endpoints accept validated form metadata and files. Route handlers delegate to services for media validation, role checks, file persistence, metadata updates, deletion lifecycle, and display reference resolution.
3. **PostgreSQL and persistent disk storage**: PostgreSQL stores all metadata, ownership, references, rotation settings, and audit information. Disk-backed storage holds uploaded binary files. Alembic updates database structure. Kubernetes mounts a persistent volume for the backend media directory.

Media loading is exposed through authenticated backend-controlled media URLs. The kiosk display and authenticated admin users use those URLs to load images/videos. Direct unauthenticated media requests are denied.

## Affected Frontend Modules

- `frontend/src/app/content/`
  - Extend content form for image/video upload, iframe entry creation, optional per-item rotation overrides, animation selection, animation duration, validation messages, and upload progress/error states.
  - Extend content list to show uploaded/iframe source type, active state, and rotation override summaries.
- `frontend/src/app/ads/`
  - Extend ad form for image upload, client association, optional per-item rotation overrides, animation selection, animation duration, validation messages, and upload progress/error states.
  - Extend ad list to show uploaded source and rotation override summaries.
- `frontend/src/app/admin/`
  - Extend display configuration UI for default main content rotation, default ad rotation, animation defaults, animation duration defaults, and inline ad count.
- `frontend/src/app/display/`
  - Load protected media references returned by display APIs, apply default or item-level rotation settings, show configured number of inline ads, and apply animation metadata.
- `frontend/src/app/shared/` or feature-local helpers
  - Shared upload error presentation, file size/type validation hints, and reusable rotation option models if needed.

## Affected Backend Modules

- `backend/app/api/`
  - Add upload-capable routes for content and ads.
  - Add protected media serving route.
  - Extend schemas/mappers for media file references, rotation metadata, animation metadata, and inline ad count.
- `backend/app/services/`
  - Add media storage service for validation, file save, reference generation, authenticated access checks, deletion lifecycle, and storage errors.
  - Extend content and ads services for uploads, iframe entries, rotation overrides, and file cleanup.
  - Extend admin/configuration service for default rotation settings and inline ad count.
  - Extend display service to resolve effective rotation settings and protected media references.
- `backend/app/repositories/`
  - Add repository functions for media file references and reference-count checks.
  - Extend content, ads, and configuration repositories with new fields.
- `backend/app/repositories/models/`
  - Add `MediaFileReference` model.
  - Extend `TopContentItem`, `ClientAdItem`, and `KioskDisplayConfiguration`.
- `backend/app/domain/`
  - Add media validation rules, effective rotation resolution, animation option validation, and inline ad count constraints.
- `backend/alembic/`
  - Add a migration for media reference table and new metadata/configuration columns.
- `backend/tests/`
  - Add unit, integration, contract, and migration coverage for upload, validation, permissions, media access, rotation behavior, and cleanup.

## API Contracts

OpenAPI contract additions are defined in [contracts/openapi.yaml](./contracts/openapi.yaml).

Primary contract groups:

- **Content uploads**
  - Create image/video content using multipart form data.
  - Create iframe content using structured metadata.
  - Update content metadata and optional rotation overrides.
  - Delete content and trigger reference-counted file cleanup.
- **Ad uploads**
  - Create image ads using multipart form data.
  - Update ad metadata and optional rotation overrides.
  - Delete ads and trigger reference-counted file cleanup.
- **Display configuration**
  - Update default content rotation, default ad rotation, animation defaults, animation duration defaults, and inline ad count.
- **Protected media**
  - Fetch uploaded media only through authenticated app user or kiosk session access.
- **Display state**
  - Return effective media URLs, effective rotation duration, animation, animation duration, and inline ad count.

Validation happens at API boundaries with request schemas, upload constraints, and domain service rules. Error responses use consistent non-sensitive messages for validation failure, authorization failure, missing file, unsupported media type, file size limit, storage failure, and load failure.

## Data Model Changes

Detailed entities and fields are defined in [data-model.md](./data-model.md).

Planned changes:

- Add `MediaFileReference` table for uploaded file metadata and storage references.
- Extend `TopContentItem` with optional `media_file_id`, optional item-level rotation fields, and animation fields.
- Extend `ClientAdItem` with optional `media_file_id`, optional item-level rotation fields, and animation fields.
- Extend `KioskDisplayConfiguration` with default animation settings and inline ad count.
- Preserve existing `source_reference` behavior while making uploaded file references resolve through protected media URLs.

## Alembic Migration Needs

One Alembic migration is required for this feature unless implementation discovers a need to split it for reviewability.

Migration must:

- Create `media_file_references`.
- Add nullable `media_file_id` to `top_content_items` and `client_ad_items`.
- Add item-level nullable rotation and animation columns to `top_content_items` and `client_ad_items`.
- Add default animation and inline ad count columns to `kiosk_display_configurations`.
- Add foreign keys from content/ad items to media file references.
- Add check constraints for positive rotation/animation values and positive inline ad count.
- Provide safe defaults for existing records so current kiosk behavior continues after migration.

No production-like flow may rely on automatic schema creation.

## Validation and Error Handling

- Reject unsupported file types before saving metadata.
- Reject images larger than 25 MB and videos larger than 500 MB.
- Reject missing required metadata, invalid client association, invalid iframe source, invalid animation values, invalid duration values, and invalid inline ad count.
- Return clear user-facing errors for validation failure, forbidden action, storage unavailable, storage full, missing media, and display load failure.
- Save file and metadata as one user-visible operation; if metadata persistence fails, the stored file must not remain as an active unreferenced upload.
- When deleting records, delete the uploaded file only when no remaining content or ad record references it.
- If media cannot load on the kiosk display, avoid broken placeholders and expose enough information for operators to identify the failed item.

## Security Considerations

- Preserve least privilege:
  - Administrators can upload/configure all content and ads.
  - Content managers can upload/configure main content only.
  - Advertising managers can upload/configure ads only.
- Uploaded media URLs require authenticated access by an authorized app user or kiosk session.
- Validate file type and size at upload boundaries; do not trust file names or client-provided media type alone.
- Store only safe media metadata; do not expose filesystem paths in public responses.
- Prevent path traversal and file overwrite behavior through storage naming rules.
- Keep operational logs and display events free of secrets and raw session tokens.
- Iframe source validation continues to follow approved-domain rules.

## Observability

- Record display events or structured logs for upload success, upload validation failure, storage failure, media deletion, media load failure, and unauthorized media access.
- Include non-sensitive identifiers such as organization, item ID, media reference ID, content/ad type, and failure category.
- Readiness diagnostics should report missing or unloadable media references without exposing internal filesystem paths.

## Accessibility

- Upload forms must be keyboard accessible and use clear labels for file input, rotation time, animation, animation duration, active status, client selection, and iframe source.
- Error states must be announced or visible in a way compatible with screen readers.
- Progress/loading states must not trap focus.
- Kiosk display media fallback states must not overlap or obscure surrounding content.

## Testing Strategy

- **Backend unit tests**: media validation rules, role checks, effective rotation resolution, inline ad count validation, reference-counted deletion, and storage failure handling.
- **Backend integration/API tests**: multipart content upload, iframe content creation, ad image upload, configuration update, forbidden uploads, media access allowed/denied, and display state output.
- **Backend contract tests**: OpenAPI schemas and paths for upload, configuration, protected media, and display state metadata.
- **Database/migration tests**: migration creates new tables/columns/constraints and preserves existing seeded content/ad behavior.
- **Frontend unit/component tests**: content upload form, ad upload form, admin configuration form, validation messages, API service request shape, and display handling of effective rotation settings.
- **Smoke validation**: start local database/backend/frontend, log in as admin, upload image content, upload video content, create iframe content, upload image ad, configure rotation/inline ad count, open display, verify protected media access and unauthenticated denial.

## Local Development Setup

- PostgreSQL runs through the existing local compose setup.
- Backend uses the existing FastAPI command and local `DATABASE_URL`.
- Uploaded files are stored in a local development media directory that maps to the same application setting used by the backend.
- Alembic migration must be applied before starting the updated backend.
- Angular dev server continues to proxy API requests to the backend.
- Local smoke validation should include at least one image content upload and one image ad upload.

## CI/CD Considerations

- CI must run backend tests, frontend tests, OpenAPI contract validation, and migration validation.
- Docker image builds must include the backend code needed to serve uploaded media.
- Kubernetes manifests need a persistent volume mount for backend media storage and an environment setting for the media directory.
- Deployment must run the Alembic migration before serving traffic with the new application version.
- ArgoCD app-of-apps integration remains outside this feature scope beyond providing deployable manifests/settings.

## Risks and Assumptions

- **Risk**: Local disk storage can fill or become unavailable. **Mitigation**: validate storage errors, expose clear admin messages, and add runtime diagnostics.
- **Risk**: Large video uploads can stress request handling and local storage. **Mitigation**: enforce 500 MB limit and test file-size rejection paths.
- **Risk**: Protected media serving can break kiosk playback if session handling is too strict. **Mitigation**: define authenticated app user or kiosk session access in contracts and test both allowed and denied cases.
- **Risk**: File cleanup can delete shared media too early. **Mitigation**: use reference-count checks before deleting files.
- **Risk**: Animation options can create inconsistent display behavior. **Mitigation**: use the constrained MVP option set (`none`, `fade`, `slide`) and validate defaults and overrides.
- **Assumption**: The existing single-organization model remains in force.
- **Assumption**: Uploaded files are retained while at least one content or ad item references them.
- **Assumption**: Existing content/ad source references continue to work after migration.

## Project Structure

### Documentation (this feature)

```text
specs/003-admin-media-uploads/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
├── checklists/
│   └── requirements.md
└── tasks.md              # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── alembic/
├── app/
│   ├── api/
│   ├── auth/
│   ├── domain/
│   ├── repositories/
│   │   └── models/
│   ├── services/
│   └── observability/
└── tests/
    ├── contract/
    ├── integration/
    └── unit/

frontend/
├── src/
│   └── app/
│       ├── admin/
│       ├── ads/
│       ├── content/
│       ├── display/
│       └── shared/

deploy/
└── kubernetes/
```

**Structure Decision**: Extend the existing repository-root split between `frontend/`, `backend/`, and `deploy/`. Keep Angular UI work, FastAPI services/routes, SQLAlchemy models/repositories, migrations, and deployment assets separate while coordinating them through OpenAPI contracts.

## Post-Design Constitution Check

- **Spec traceability**: PASS. `research.md`, `data-model.md`, `contracts/openapi.yaml`, and `quickstart.md` map to the approved feature specification.
- **Requirement clarity**: PASS. No unresolved clarification markers remain.
- **Plan alignment**: PASS. The design preserves Angular, TypeScript, FastAPI, SQLAlchemy, Alembic, PostgreSQL, and OpenAPI as required.
- **Simplicity**: PASS. The design adds one media reference model/service and extends existing feature modules instead of adding speculative subsystems.
- **Contracts**: PASS. API behavior is documented in `contracts/openapi.yaml`.
- **Testing**: PASS. Backend, frontend, migration, contract, and smoke validation are planned.
- **Security, observability, accessibility**: PASS. Protected media access, least privilege, upload validation, display diagnostics, and accessible form/error states are included.
- **No speculative scope**: PASS. Bulk upload, cloud storage, transcoding, analytics, and media editing remain excluded.
- **Conflict handling**: PASS. Implementation must stop if the approved spec or plan conflicts with implementation reality.

## Complexity Tracking

No constitution violations or complexity exceptions are required for this feature.
