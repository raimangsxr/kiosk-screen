import { DisplayContentItem, DisplayKioskConfiguration } from '../core/api/display.api';

/**
 * Stable fingerprint comparison for `DisplayState`. Used by the polled
 * `watchState()` observable (via `distinctUntilChanged`) to decide
 * whether a new poll actually carries a different state worth pushing
 * to subscribers, and by `KioskRotationController.bindInputs` to know
 * whether to re-arm the rotation timers on each poll.
 *
 * Lives in its own file so the HTTP layer (`display.api.ts`) stays
 * focused on the request/response shape and the fingerprint logic is
 * unit-testable in isolation. The comparison is intentionally
 * shallow: it covers the fields the runtime actually reacts to
 * (queue shape, ads shape, configuration, remote-control fields,
 * selected iframe id).
 */
export function sameTopContentState(
  prev: readonly DisplayContentItem[],
  curr: readonly DisplayContentItem[],
): boolean {
  if (prev.length !== curr.length) {
    return false;
  }
  for (let i = 0; i < prev.length; i++) {
    const p = prev[i];
    const c = curr[i];
    if (
      p.id !== c.id ||
      p.displayOrder !== c.displayOrder ||
      p.isActive !== c.isActive ||
      (p.isFixed ?? false) !== (c.isFixed ?? false) ||
      (p.isNovelty ?? false) !== (c.isNovelty ?? false) ||
      (p.recurringEveryXIterations ?? null) !== (c.recurringEveryXIterations ?? null)
    ) {
      return false;
    }
  }
  return true;
}

export function sameAdsState(
  prev: readonly { id: string; displayOrder: number; isActive?: boolean }[],
  curr: readonly { id: string; displayOrder: number; isActive?: boolean }[],
): boolean {
  if (prev.length !== curr.length) {
    return false;
  }
  for (let i = 0; i < prev.length; i++) {
    const p = prev[i];
    const c = curr[i];
    if (p.id !== c.id || p.displayOrder !== c.displayOrder || p.isActive !== c.isActive) {
      return false;
    }
  }
  return true;
}

export function sameDisplayConfiguration(
  prev: DisplayKioskConfiguration,
  curr: DisplayKioskConfiguration,
): boolean {
  return (
    prev.id === curr.id &&
    prev.name === curr.name &&
    prev.topRegionRatio === curr.topRegionRatio &&
    prev.bottomRegionRatio === curr.bottomRegionRatio &&
    prev.defaultTopDurationSeconds === curr.defaultTopDurationSeconds &&
    prev.defaultAdDurationSeconds === curr.defaultAdDurationSeconds &&
    prev.defaultTopRotationAnimation === curr.defaultTopRotationAnimation &&
    prev.defaultAdRotationAnimation === curr.defaultAdRotationAnimation &&
    prev.defaultTopAnimationDurationMilliseconds === curr.defaultTopAnimationDurationMilliseconds &&
    prev.defaultAdAnimationDurationMilliseconds === curr.defaultAdAnimationDurationMilliseconds &&
    prev.inlineAdCount === curr.inlineAdCount &&
    prev.remoteControlPollingSeconds === curr.remoteControlPollingSeconds &&
    prev.videoEndDelaySeconds === curr.videoEndDelaySeconds &&
    prev.isEnabled === curr.isEnabled
  );
}