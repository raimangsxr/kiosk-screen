---
id: CHG-027
type: change
status: in-progress
modifies:
  - CONTENT.ROTATION
  - PUBLIC_CONTENT.API_KEYS
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
requires_contract_update: true
read_by_default: true
---

# Feature Specification: Public-content novelty rotation queue

## Goal

When content is uploaded via the public API, mark it as a novelty and intercept
loop-mode rotation on the kiosk so pending novelties are shown (in
`displayOrder`) before the regular queue resumes at the item after the one
that was visible when the burst started.

## Requirements

- `POST /api/public/content/upload` sets `isNovelty = true` on the new item.
- Admin uploads leave `isNovelty = false`.
- `GET /api/display/state` exposes `topContent[].isNovelty`.
- Kiosk loop mode (not paused, not fixed/iframe) checks pending novelties on
  every content transition (timer, video ended, remote next/previous).
- Pending novelties are ordered by `displayOrder` ascending.
- Items with `isNovelty = true` are excluded from the regular rotation queue.
- On showing a novelty, the kiosk calls
  `POST /api/display/content/{contentId}/consume-novelty` atomically; first
  kiosk wins (204), others get 409 and skip to the next pending novelty.
- Novelty slides use kiosk default top duration and animation, not per-item
  overrides.
- After the burst drains, resume regular rotation with
  `pickNext(regularQueue, resumeCursorId)` where `resumeCursorId` is the regular
  item visible when the burst started.
- Recurring cadence does not advance during a novelty burst; after the burst,
  the resume step is a direct regular advance (recurring applies again on later
  transitions).

## Acceptance scenarios

1. Public upload → display state includes `isNovelty: true` until consumed.
2. Kiosk in loop shows the novelty on the **next** content transition, not
   mid-slide.
3. Two public uploads → shown in `displayOrder` order during the burst.
4. After burst, rotation continues with the item after the pre-burst regular
   cursor.
5. Second kiosk receives 409 on consume and does not show that novelty.
6. Fixed / iframe / paused loop does not intercept novelties.
7. Novelty uses `defaultTopDurationSeconds` and default top animation.

## Validation

- `pytest backend/tests/integration/test_public_content_upload.py`
- `pytest backend/tests/integration/test_public_content_novelty.py`
- `npm --prefix frontend run test` (kiosk-rotation + display-rotation)

## Non-goals

- Admin upload marking novelty
- Per-kiosk novelty ack persistence
- Admin UI badge for novelty items
