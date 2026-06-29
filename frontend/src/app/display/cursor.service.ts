import { Injectable } from '@angular/core';

/**
 * Cursor transition helpers. Pure functions that operate on a snapshot
 * of the cursor state. The kiosk rotation controller owns the actual
 * state (`_regularCursorId`, `_loopCursorBeforeFixed`, the public
 * `currentContentId` signal) so it stays the single source of truth
 * for the cursor; this service exists to make the transition rules
 * testable in isolation and to give them a clear name.
 *
 * Splitting the cursor logic out of the rotation controller keeps
 * timer arming, cadence rules, and cursor bookkeeping on separate
 * axes — each can evolve independently. The cursor service is pure:
 * it never touches timers, cursors, or signals.
 *
 * @see specs/changes/021-kiosk-runtime-refactor/spec.md FR-2
 */
@Injectable()
export class CursorService {
  /**
   * Apply a `setCursor` request. Returns the new values for the public
   * `currentContentId` and the private `_regularCursorId` so the caller
   * can persist them.
   */
  applySetCursor(
    itemId: string | null,
    currentRegularCursorId: string | null,
    isRegular: boolean
  ): { currentContentId: string | null; regularCursorId: string | null } {
    if (itemId === null) {
      return { currentContentId: null, regularCursorId: null };
    }
    return {
      currentContentId: itemId,
      regularCursorId: isRegular ? itemId : currentRegularCursorId
    };
  }

  /**
   * Apply an `enterFixed` request. Returns the new memorized loop cursor
   * alongside the new `currentContentId`. The first call records the
   * current cursor (so the operator can resume on exit); subsequent
   * calls preserve the previously memorized cursor.
   */
  applyEnterFixed(
    contentId: string,
    currentContentIdBefore: string | null,
    memorizedLoopCursorBefore: string | null
  ): { currentContentId: string; loopCursorBeforeFixed: string | null } {
    return {
      currentContentId: contentId,
      loopCursorBeforeFixed:
        memorizedLoopCursorBefore !== null ? memorizedLoopCursorBefore : currentContentIdBefore
    };
  }

  /**
   * Apply an `exitFixed` request. Returns the next `currentContentId`:
   * the previously memorized cursor if any, otherwise the value passed
   * in (no change). Also clears the memorized cursor.
   */
  applyExitFixed(
    currentContentIdBefore: string | null,
    memorizedLoopCursorBefore: string | null
  ): { currentContentId: string | null; loopCursorBeforeFixed: null } {
    if (memorizedLoopCursorBefore === null) {
      return { currentContentId: currentContentIdBefore, loopCursorBeforeFixed: null };
    }
    return {
      currentContentId: memorizedLoopCursorBefore,
      loopCursorBeforeFixed: null
    };
  }
}