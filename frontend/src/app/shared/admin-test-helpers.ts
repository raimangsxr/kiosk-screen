import { of } from 'rxjs';

export const adminTestReadiness = { ready: false, blockers: ['Add active content'], warnings: ['Review display configuration'] };
export const adminTestConfiguration = {
  id: 'config-1',
  name: 'Main kiosk',
  defaultTopDurationSeconds: 10,
  defaultAdDurationSeconds: 8,
  defaultTopRotationAnimation: 'fade',
  defaultAdRotationAnimation: 'slide',
  defaultTopAnimationDurationMilliseconds: 300,
  defaultAdAnimationDurationMilliseconds: 300,
  inlineAdCount: 2,
  remoteControlPollingSeconds: 3,
  configuredEventDurationMinutes: 60,
  isEnabled: true
};

export function observableOf<T>(value: T) {
  return of(value);
}
