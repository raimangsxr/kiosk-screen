import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { RotationSchedulerService } from './rotation-scheduler.service';

describe('RotationSchedulerService', () => {
  let service: RotationSchedulerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RotationSchedulerService]
    });
    service = TestBed.inject(RotationSchedulerService);
  });

  it('fires the content callback after the requested duration', fakeAsync(() => {
    let fired = 0;
    service.armContent(2000, () => fired++);
    expect(service.hasContentTimer()).toBeTrue();

    tick(1999);
    expect(fired).toBe(0);

    tick(1);
    expect(fired).toBe(1);
    expect(service.hasContentTimer()).toBeFalse();
  }));

  it('fires the ad callback after the requested duration', fakeAsync(() => {
    let fired = 0;
    service.armAd(1500, () => fired++);

    tick(1500);
    expect(fired).toBe(1);
  }));

  it('clamps durations below MIN_DURATION_MS to 100ms', fakeAsync(() => {
    let fired = 0;
    service.armContent(0, () => fired++);
    tick(99);
    expect(fired).toBe(0);
    tick(1);
    expect(fired).toBe(1);
  }));

  it('clamps negative durations to 100ms', fakeAsync(() => {
    let fired = 0;
    service.armContent(-50, () => fired++);
    tick(100);
    expect(fired).toBe(1);
  }));

  it('clearContent cancels the pending content timer', fakeAsync(() => {
    let fired = 0;
    service.armContent(2000, () => fired++);
    service.clearContent();
    tick(5000);
    expect(fired).toBe(0);
    expect(service.hasContentTimer()).toBeFalse();
  }));

  it('armContent replaces a previously armed content timer', fakeAsync(() => {
    let firstFired = 0;
    let secondFired = 0;
    service.armContent(2000, () => firstFired++);
    service.armContent(3000, () => secondFired++);

    tick(2000);
    expect(firstFired).toBe(0);
    expect(secondFired).toBe(0);

    tick(1000);
    expect(secondFired).toBe(1);
  }));

  it('clearAll cancels both timers', fakeAsync(() => {
    let contentFired = 0;
    let adFired = 0;
    service.armContent(2000, () => contentFired++);
    service.armAd(2000, () => adFired++);

    service.clearAll();
    tick(5000);

    expect(contentFired).toBe(0);
    expect(adFired).toBe(0);
    expect(service.hasContentTimer()).toBeFalse();
    expect(service.hasAdTimer()).toBeFalse();
  }));

  it('clearContent does not affect the ad timer', fakeAsync(() => {
    let adFired = 0;
    service.armAd(2000, () => adFired++);
    service.clearContent();
    tick(2000);
    expect(adFired).toBe(1);
  }));
});