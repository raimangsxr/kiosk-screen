# Context pack: CHG-027 public-content novelty rotation

- Current status: implemented

## Active contracts

- `specs/contracts/content-rotation/contract.md`
- `specs/contracts/public-content-api-keys/contract.md`

## Key code paths

- Backend: `content_service.append_via_public_api`, `display.py` consume endpoint,
  `TopContentItem.is_novelty`
- Frontend: `KioskRotationController._advanceContent`, `RecurringCadenceService.regularQueue`,
  `DisplayApiService.consumeNovelty`

## Decisions

- Multi-kiosk: first consumer wins via conditional `UPDATE` on `is_novelty`.
- Novelty order: `displayOrder` ASC.
- Consume at slide **start** (claim), not at video end.
