# Context Pack: CHG-036 Sponsor Strip Rotation and Borders

## Task classification

- Type: change to existing contracts
- Affected contracts: `DISPLAY.RUNTIME`, `CONTENT.ROTATION`, `DISPLAY.CONFIG_SESSION`
- Requires contract update: yes (done in PR #35)
- Current status: implemented

## Mandatory context

- `specs/manifest.yml`
- `specs/changes/036-sponsor-strip-rotation/spec.md`
- `specs/contracts/display-runtime/contract.md`
- `specs/contracts/content-rotation/contract.md`
- `specs/contracts/display-config-session/contract.md`

## Code entrypoints

- `backend/app/services/display_service.py`
- `backend/app/api/mappers.py`
- `backend/alembic/versions/0019_inline_ad_item_border.py`
- `frontend/src/app/display/display-screen.component.ts`
- `frontend/src/app/display/kiosk-rotation.controller.ts`

## Validation

```sh
pytest backend/tests/unit/test_display_service.py
npm --prefix frontend run test -- --include='**/kiosk-rotation.controller.spec.ts'
```
