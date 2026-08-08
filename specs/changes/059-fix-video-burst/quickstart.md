# Validation Quickstart: CHG-059

## Automated validation

```sh
npm --prefix frontend run test -- --watch=false \
  --include='src/app/display/display-media-cache.service.spec.ts' \
  --include='src/app/display/display-content-gate.service.spec.ts' \
  --include='src/app/display/display-viewer.controller.spec.ts' \
  --include='src/app/display/display-screen.component.spec.ts'

npm --prefix frontend run test -- --watch=false --include='src/app/display/**/*.spec.ts'
npm --prefix frontend run build
```

## Required scenarios

1. Queue ten mixed media items and assert that only three HTTP requests are active before any completes.
2. Complete non-retained novelty preparations and assert that their temporary Blob URLs are revoked and the visible cache remains bounded.
3. Retain a logically ready novelty and assert that it is prepared again before `show_content` commits it.
4. Fail a preparation, assert immediate retry is suppressed, advance beyond cooldown, and assert the next request succeeds.
5. Emit `error` twice from the current video and assert one `media_error`; replace the command and assert an error from the old element is ignored.
6. Issue two commands for the same video and assert the media element is remounted for the second command.

## Manual smoke check

In a local kiosk session, upload a burst containing several videos and photographs. Observe that the current slide remains visible while preparation proceeds, videos continue playing after the burst, and the tab remains responsive. This is supplemental; automated tests are the acceptance gate.

## Completion evidence

- Focused cache and content-gate specs: 25 passed.
- Viewer and screen specs: 69 passed; 18 existing skipped tests.
- Complete display runtime suite: 243 passed; 18 existing skipped tests.
- Complete frontend suite: 553 passed; 18 existing skipped tests.
- Production frontend build: passed.
- `git diff --check`: passed.
- Manual burst smoke check: not run; it remains supplemental to the automated acceptance gate.
