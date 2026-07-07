# Quickstart: Independent Recurring Content Counters

**Date**: 2026-07-08  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Prerequisites

- Local lab per `docs/dev/local-lab.md`
- Backend + frontend running
- Operator session for admin; kiosk at `/display` in loop mode

## Automated validation (primary)

```sh
npm --prefix frontend run test -- --include='**/recurring-cadence.service.spec.ts'
npm --prefix frontend run test -- --include='**/kiosk-rotation.controller.spec.ts'
npm --prefix frontend run test
npm --prefix frontend run build
```

Backend pytest suite unchanged (no backend diff expected).

## Manual kiosk checks

### 1. Independent cadences (US-1)

1. Create regular content R₁, R₂, R₃ (10 s default).
2. Create recurring **Sponsor A** with N=6, `displayOrder` 10.
3. Create recurring **Sponsor B** with N=30, `displayOrder` 20.
4. Open kiosk loop mode; count transitions over ~2 minutes.
5. **Expect**: A appears on transitions 6, 12, 18, …; when A and B both due at transition 30, A shows first and B on transition 31.

### 2. Normal rotation delay (US-2)

1. Regular A, B, C + recurring X (N=3); bootstrap at A.
2. **Expect**: X on transitions **3** and **6**; after seven transitions screens are `B → C → X → A → B → X → C`.

### 3. Recurring-only filler (US-3)

1. Deactivate or remove all regular content; keep two recurring items.
2. **Expect**: Screen cycles sponsors between due events; counters still advance.

### 4. Pause (US-4)

1. With counters mid-cycle, pause from remote control.
2. Wait 30 s.
3. Resume.
4. **Expect**: Counters unchanged during pause; cadence continues from preserved values.

### 5. Spotlight recurring (US-4)

1. From admin content list, “Show on screen” (`jump_to`) on recurring B.
2. **Expect**: B displays; only B's counter resets; A's schedule unaffected.

### 6. Hot cadence edit (US-4)

1. With A at counter ~18 and N=30, change A to N=10 in admin.
2. After next poll, **expect**: A's counter reset; next A appearance follows new N.

## Pre-merge gates

1. Update `specs/contracts/content-rotation/contract.md` (see [contracts/recurring-cadence-behavior.md](./contracts/recurring-cadence-behavior.md)).
2. Add CHG-039 to `specs/manifest.yml` under `CONTENT.ROTATION.related_changes`.
3. All automated tests pass.

## Rollback

Revert frontend commit(s) only. No database rollback required.
