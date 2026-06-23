# Requirements Checklist: Display Screen Runtime

## Spec quality

- [X] Spec has at least 3 user stories (5 here).
- [X] Every user story has an explicit priority.
- [X] Every user story has an independent test.
- [X] Every user story has at least 2 acceptance scenarios.
- [X] No `NEEDS CLARIFICATION` marker.

## Traceability

- [X] Every FR maps to a frontend file.
- [X] Every FR maps to at least one user story.
- [X] Every success criterion is measurable.

## Security

- [X] The poll runs over the operator session cookie.
- [X] `requestFullscreen()` only runs in response to a
      backend-authorized `fullscreen_requested=true`.

## Testing

- [X] Karma specs for the controller, the rotation service, the
      screen component, the cross-tab sync, the fullscreen
      handling, the ad band, the overlay, the empty-queue POST.

## Out-of-scope hygiene

- [X] Out of Scope section is explicit and non-empty.
- [X] No `data-model.md` / `research.md` / `contracts/`
      directory.
