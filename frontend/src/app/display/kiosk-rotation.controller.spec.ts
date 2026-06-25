import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Injector, signal } from '@angular/core';

import { DisplayContentItem } from '../core/api/display.api';
import { KioskRotationController } from './kiosk-rotation.controller';

function makeContent(
  id: string,
  displayOrder: number,
  durationSeconds: number = 5,
): DisplayContentItem {
  return {
    id,
    title: id,
    contentType: 'photo',
    sourceReference: `${id}.jpg`,
    isActive: true,
    displayOrder,
    durationSeconds,
    effectiveDurationSeconds: durationSeconds,
    effectiveRotationAnimation: 'none',
  };
}

function makeAd(
  id: string,
  displayOrder: number,
  durationSeconds: number = 5,
): DisplayContentItem {
  return {
    id,
    title: id,
    contentType: 'photo',
    sourceReference: `${id}.jpg`,
    isActive: true,
    displayOrder,
    durationSeconds,
    effectiveDurationSeconds: durationSeconds,
    effectiveRotationAnimation: 'none',
  };
}

describe('KioskRotationController', () => {
  let controller: KioskRotationController;
  let testInjector: Injector;

  beforeEach(() => {
    // The controller is no longer `providedIn: 'root'` (CHG-019 fix).
    // Tests provide it explicitly via the test module.
    TestBed.configureTestingModule({
      providers: [KioskRotationController]
    });
    controller = TestBed.inject(KioskRotationController);
    testInjector = TestBed.inject(Injector);
  });

  it('starts in loop mode with no content, no ads, and adIndex=0', () => {
    expect(controller.contentMode()).toBe('loop');
    expect(controller.currentContentId()).toBeNull();
    expect(controller.currentContent()).toBeNull();
    expect(controller.currentAd()).toBeNull();
    expect(controller.adIndex()).toBe(0);
    expect(controller.adAnimationRun()).toBe(0);
    expect(controller.isPaused()).toBeFalse();
    expect(controller.fixedContentId()).toBeNull();
  });

  it('exposes a single empty visibleAds until inputs are wired', () => {
    expect(controller.visibleAds()).toEqual([]);
  });

  it('arms the ad timer on attach with the configured default duration only (FR-012)', fakeAsync(() => {
    const ads = signal<ReadonlyArray<DisplayContentItem>>([
      { ...makeAd('ad-1', 1, 99), effectiveDurationSeconds: 99 },
      { ...makeAd('ad-2', 2, 99), effectiveDurationSeconds: 99 },
    ]);
    const adDuration = signal(10);
    const inlineCount = signal(1);

    controller.bindInputs({
      contentMode: () => 'loop',
      contentQueue: () => [],
      ads: () => ads(),
      fixedContentId: () => null,
      effectiveDurationSeconds: () => 10,
      adDurationSeconds: () => adDuration(),
      inlineAdCount: () => inlineCount(),
      videoEndDelaySeconds: () => 2,
    }, testInjector);
    TestBed.tick();

    expect(controller.adIndex()).toBe(0);
    expect(controller.currentAd()?.id).toBe('ad-1');

    // After 10s of the *configured* ad duration, the index advances — even
    // though the per-ad effectiveDurationSeconds is 99.
    tick(9_999);
    expect(controller.adIndex()).toBe(0);
    tick(1);
    expect(controller.adIndex()).toBe(1);
    expect(controller.currentAd()?.id).toBe('ad-2');

    // The next tick uses the configured duration again, NOT the per-ad 99.
    tick(9_999);
    expect(controller.adIndex()).toBe(1);
    tick(1);
    expect(controller.adIndex()).toBe(0);

    // Live update of the configured duration is honored on the next tick.
    adDuration.set(2);
    TestBed.tick();
    tick(1_999);
    expect(controller.adIndex()).toBe(0);
    tick(1);
    expect(controller.adIndex()).toBe(1);

    // Replace the ads list — the timer re-arms with the new list at the new
    // duration. The previous adIndex was 1; with a single ad the next advance
    // wraps to 0.
    ads.set([makeAd('only-1', 1)]);
    TestBed.tick();
    tick(1_999);
    expect(controller.adIndex()).toBe(1);
    tick(1);
    expect(controller.adIndex()).toBe(0);
    tick(1_999);
    expect(controller.adIndex()).toBe(0);
    tick(1);
    expect(controller.adIndex()).toBe(0);

    controller.detach();
  }));

  it('keeps rotating ads in fixed and iframe modes (FR-008b)', fakeAsync(() => {
    const ads = signal<ReadonlyArray<DisplayContentItem>>([makeAd('ad-1', 1), makeAd('ad-2', 2)]);
    const mode = signal<'loop' | 'iframe' | 'fixed'>('loop');

    controller.bindInputs({
      contentMode: () => mode(),
      contentQueue: () => [makeContent('A', 1)],
      ads: () => ads(),
      fixedContentId: () => (mode() === 'fixed' ? 'A' : null),
      effectiveDurationSeconds: () => 100,
      adDurationSeconds: () => 1,
      inlineAdCount: () => 1,
      videoEndDelaySeconds: () => 2,
    }, testInjector);
    TestBed.tick();

    // Enter fixed mode; the ad index must keep advancing.
    mode.set('fixed');
    TestBed.tick();
    tick(1_000);
    expect(controller.adIndex()).toBe(1);

    // Now iframe; the ad index keeps advancing.
    mode.set('iframe');
    TestBed.tick();
    tick(1_000);
    expect(controller.adIndex()).toBe(0);

    controller.detach();
  }));

  it('rotates visibleAds following the ad index and inline count', fakeAsync(() => {
    const ads = signal<ReadonlyArray<DisplayContentItem>>([makeAd('a', 1), makeAd('b', 2), makeAd('c', 3)]);
    const inlineCount = signal(2);

    controller.bindInputs({
      contentMode: () => 'loop',
      contentQueue: () => [makeContent('A', 1)],
      ads: () => ads(),
      fixedContentId: () => null,
      effectiveDurationSeconds: () => 100,
      adDurationSeconds: () => 1,
      inlineAdCount: () => inlineCount(),
      videoEndDelaySeconds: () => 2,
    }, testInjector);
    TestBed.tick();

    expect(controller.visibleAds().map((ad) => ad.id)).toEqual(['a', 'b']);
    tick(1_000);
    expect(controller.visibleAds().map((ad) => ad.id)).toEqual(['b', 'c']);
    tick(1_000);
    expect(controller.visibleAds().map((ad) => ad.id)).toEqual(['c', 'a']);

    inlineCount.set(1);
    TestBed.tick();
    expect(controller.visibleAds().map((ad) => ad.id)).toEqual(['c']);

    controller.detach();
  }));

  it('pins the fixed content and preserves the loop cursor on exit (FR-014 / FR-015)', fakeAsync(() => {
    const queue = signal<DisplayContentItem[]>([
      makeContent('A', 1),
      makeContent('B', 2),
      makeContent('C', 3),
    ]);
    const mode = signal<'loop' | 'iframe' | 'fixed'>('loop');
    const fixedId = signal<string | null>(null);

    controller.bindInputs({
      contentMode: () => mode(),
      contentQueue: () => queue(),
      ads: () => [],
      fixedContentId: () => fixedId(),
      effectiveDurationSeconds: () => 1,
      adDurationSeconds: () => 1,
      inlineAdCount: () => 1,
      videoEndDelaySeconds: () => 2,
    }, testInjector);
    TestBed.tick();

    // The component is responsible for setting the initial cursor; the
    // controller exposes setCursor() so the component can write to it.
    controller.setCursor('B');
    TestBed.tick();

    // Enter fixed mode → the loop cursor is remembered, the controller pins
    // the fixed target.
    mode.set('fixed');
    fixedId.set('C');
    TestBed.tick();
    controller.enterFixedMode('C');
    expect(controller.contentMode()).toBe('fixed');
    expect(controller.fixedContentId()).toBe('C');
    expect(controller.currentContentId()).toBe('C');

    // Move on: re-entering with a different target updates the pinned cursor
    // and keeps the previous loop cursor (B) intact.
    controller.enterFixedMode('A');
    expect(controller.fixedContentId()).toBe('A');
    expect(controller.currentContentId()).toBe('A');

    // Exit fixed mode → the loop cursor (B) is restored.
    mode.set('loop');
    fixedId.set(null);
    TestBed.tick();
    controller.exitFixedMode();
    expect(controller.fixedContentId()).toBeNull();
    expect(controller.currentContentId()).toBe('B');

    controller.detach();
  }));

  it('does not advance the content cursor on video ended in fixed mode (FR-014)', fakeAsync(() => {
    const queue = signal<DisplayContentItem[]>([makeContent('fixed-target', 1, 10)]);
    const mode = signal<'loop' | 'iframe' | 'fixed'>('loop');
    const fixedId = signal<string | null>(null);

    controller.bindInputs({
      contentMode: () => mode(),
      contentQueue: () => queue(),
      ads: () => [],
      fixedContentId: () => fixedId(),
      effectiveDurationSeconds: () => 1,
      adDurationSeconds: () => 1,
      inlineAdCount: () => 1,
      videoEndDelaySeconds: () => 2,
    }, testInjector);
    TestBed.tick();

    mode.set('fixed');
    fixedId.set('fixed-target');
    controller.enterFixedMode('fixed-target');
    TestBed.tick();

    // Video ended in fixed mode must NOT advance the cursor.
    controller.onVideoEnded();
    tick(10_000);
    expect(controller.currentContentId()).toBe('fixed-target');

    controller.detach();
  }));

  it('debounces the empty-queue rotation event to once per 60s (FR-009 / spec 007)', fakeAsync(() => {
    const sink = jasmine.createSpy('sink');
    controller.rotationEventSink = sink;
    controller.bindInputs({
      contentMode: () => 'loop',
      contentQueue: () => [],
      ads: () => [],
      fixedContentId: () => null,
      effectiveDurationSeconds: () => 10,
      adDurationSeconds: () => 10,
      inlineAdCount: () => 1,
      videoEndDelaySeconds: () => 2,
    }, testInjector);
    TestBed.tick();
    tick(500);
    expect(sink).toHaveBeenCalledTimes(1);

    // Rapid re-trigger is suppressed by the 60s debounce.
    (controller as unknown as { _scheduleEmptyQueueCheck: () => void })._scheduleEmptyQueueCheck();
    tick(500);
    expect(sink).toHaveBeenCalledTimes(1);

    controller.detach();
  }));

  it('pause freezes the content timer but keeps the ad timer rotating (spec 007 FR-008 addendum)', fakeAsync(() => {
    const ads = signal<ReadonlyArray<DisplayContentItem>>([makeAd('ad-1', 1), makeAd('ad-2', 2), makeAd('ad-3', 3)]);
    controller.bindInputs({
      contentMode: () => 'loop',
      contentQueue: () => [makeContent('A', 1)],
      ads: () => ads(),
      fixedContentId: () => null,
      effectiveDurationSeconds: () => 10,
      adDurationSeconds: () => 1,
      inlineAdCount: () => 1,
      videoEndDelaySeconds: () => 2,
    }, testInjector);
    TestBed.tick();
    controller.currentContentId.set('A');
    TestBed.tick();

    expect(controller.isPaused()).toBeFalse();
    controller.pause();
    expect(controller.isPaused()).toBeTrue();

    // 3 seconds elapse while paused. With 3 ads at 1s cadence, after 3
    // advances the adIndex wraps to 0; we assert it has moved past the
    // starting position to prove the ad timer kept ticking.
    tick(3_000);

    // Content cursor is frozen on A.
    expect(controller.currentContentId()).toBe('A');

    // Ad index has advanced at least 1 tick (1s cadence × 3s elapsed =
    // 3 advances; with 3 ads that lands back on 0, so we just confirm
    // the timer fired by checking the animation-run counter bumped).
    expect(controller.adAnimationRun()).toBeGreaterThan(0);

    controller.detach();
  }));

  it('resume re-arms the content timer after pause (spec 007 FR-008 addendum)', fakeAsync(() => {
    controller.bindInputs({
      contentMode: () => 'loop',
      contentQueue: () => [makeContent('A', 1), makeContent('B', 2)],
      ads: () => [],
      fixedContentId: () => null,
      effectiveDurationSeconds: () => 1,
      adDurationSeconds: () => 10,
      inlineAdCount: () => 1,
      videoEndDelaySeconds: () => 2,
    }, testInjector);
    TestBed.tick();
    controller.setCursor('A');
    TestBed.tick();

    controller.pause();
    tick(3_000);
    expect(controller.currentContentId()).toBe('A');

    controller.resume();
    tick(1_000);
    expect(controller.currentContentId()).toBe('B');

    controller.detach();
  }));

  it('shows the recurring content every N advances (spec 007 US2 / FR-008a)', fakeAsync(() => {
    const recurring: DisplayContentItem = {
      ...makeContent('REC', 99, 0.05),
      recurringEveryXIterations: 3,
    };
    const queue = signal<DisplayContentItem[]>([
      makeContent('A', 1),
      makeContent('B', 2),
      makeContent('C', 3),
      makeContent('D', 4),
      recurring,
    ]);
    controller.bindInputs({
      contentMode: () => 'loop',
      contentQueue: () => queue(),
      ads: () => [],
      fixedContentId: () => null,
      effectiveDurationSeconds: () => 0.1,
      adDurationSeconds: () => 10,
      inlineAdCount: () => 1,
      videoEndDelaySeconds: () => 0,
    }, testInjector);
    TestBed.tick();
    controller.setCursor('A');
    TestBed.tick();

    // Advance 12 times: the recurring item must appear at advances 4, 8,
    // and 12 (per spec 007 US2 acceptance 1). The initial 'A' is at
    // position 1 of the visited sequence, so REC lands at positions 5,
    // 9, and 13.
    const sequence: Array<string | null> = [controller.currentContentId()];
    for (let i = 0; i < 12; i++) {
      tick(100);
      sequence.push(controller.currentContentId());
    }

    const visited = sequence.filter((id): id is string => Boolean(id));
    const recurringPositions = visited
      .map((id, idx) => (id === 'REC' ? idx + 1 : 0))
      .filter((idx) => idx > 0);
    expect(recurringPositions).toEqual([5, 9, 13]);

    controller.detach();
  }));

  it('consumes the jump_to command by resetting the cursor to the target (spec 014 addendum 2 / US7)', fakeAsync(() => {
    const queue = signal<DisplayContentItem[]>([
      makeContent('A', 1),
      makeContent('B', 2),
      makeContent('C', 3),
      makeContent('D', 4),
      makeContent('E', 5),
    ]);
    controller.bindInputs({
      contentMode: () => 'loop',
      contentQueue: () => queue(),
      ads: () => [],
      fixedContentId: () => null,
      effectiveDurationSeconds: () => 10,
      adDurationSeconds: () => 10,
      inlineAdCount: () => 1,
      videoEndDelaySeconds: () => 2,
    }, testInjector);
    TestBed.tick();
    controller.setCursor('A');
    controller.cadenceCounter.set(2);
    TestBed.tick();

    controller.applyNavigationCommand('jump_to', 'D');

    expect(controller.currentContentId()).toBe('D');
    expect(controller.cadenceCounter()).toBe(0);

    controller.detach();
  }));

  it('silently ignores jump_to for an unknown target (spec 014 addendum 2 / US7 acceptance 3)', fakeAsync(() => {
    controller.bindInputs({
      contentMode: () => 'loop',
      contentQueue: () => [makeContent('A', 1), makeContent('B', 2)],
      ads: () => [],
      fixedContentId: () => null,
      effectiveDurationSeconds: () => 10,
      adDurationSeconds: () => 10,
      inlineAdCount: () => 1,
      videoEndDelaySeconds: () => 2,
    }, testInjector);
    TestBed.tick();
    controller.setCursor('A');
    TestBed.tick();

    expect(() => controller.applyNavigationCommand('jump_to', 'missing-id')).not.toThrow();
    expect(controller.currentContentId()).toBe('A');

    controller.detach();
  }));

  it('honors a cadence change pushed by the polled state without a page reload', fakeAsync(() => {
    // The kiosk polls and the operator updates the recurring cadence
    // from 3 to 10 mid-rotation. The controller's effect re-runs on
    // every queue change, picks up the new cadence via
    // `_smallestRecurringCadence`, and the next advance must reflect
    // the new cadence without the operator refreshing the browser.
    // The trigger is `cadenceCounter > cadence`, so the recurring
    // appears on the (N+1)th advance where N is the cadence.
    const initialQueue: DisplayContentItem[] = [
      makeContent('A', 1),
      makeContent('B', 2),
      makeContent('C', 3),
      makeContent('D', 4),
      { ...makeContent('REC', 99, 0.1), recurringEveryXIterations: 3 },
    ];
    const queue = signal<DisplayContentItem[]>(initialQueue);
    controller.bindInputs({
      contentMode: () => 'loop',
      contentQueue: () => queue(),
      ads: () => [],
      fixedContentId: () => null,
      effectiveDurationSeconds: () => 0.1,
      adDurationSeconds: () => 10,
      inlineAdCount: () => 1,
      videoEndDelaySeconds: () => 0,
    }, testInjector);
    TestBed.tick();
    controller.setCursor('A');
    TestBed.tick();

    // Walk the cursor up to a counter of 2 (two advances since setCursor).
    tick(100);
    expect(controller.cadenceCounter()).toBe(1);
    tick(100);
    expect(controller.cadenceCounter()).toBe(2);

    // Operator pushes a cadence change to 10 via the polled state.
    // The fingerprint (see display.api.spec) is responsible for
    // letting this state through; here we simulate the same update
    // landing on the input signal.
    queue.set([
      ...initialQueue.slice(0, 4),
      { ...makeContent('REC', 99, 0.1), recurringEveryXIterations: 10 },
    ]);
    TestBed.tick();

    // Advance through 9 more regular advances (cadence=10, so the
    // 11th advance is the recurring). Counter goes 3 → 11, recurring
    // appears on the 11th advance and resets the counter.
    for (let i = 0; i < 10; i++) {
      tick(100);
      if (controller.currentContentId() === 'REC') {
        expect(controller.cadenceCounter()).toBe(0);
        controller.detach();
        return;
      }
    }
    // If we reach here, the recurring never appeared in the new cadence
    // window — fail with a diagnostic.
    fail(`Recurring did not appear under the new cadence=10 within 10 advances; counter=${controller.cadenceCounter()}, cursor=${controller.currentContentId()}`);
  }));

  it('resets the cadence counter to 0 when the last recurring is removed (spec 014 addendum 2)', fakeAsync(() => {
    const queue = signal<DisplayContentItem[]>([
      makeContent('A', 1),
      makeContent('B', 2),
      { ...makeContent('REC', 99, 0.1), recurringEveryXIterations: 2 },
    ]);
    controller.bindInputs({
      contentMode: () => 'loop',
      contentQueue: () => queue(),
      ads: () => [],
      fixedContentId: () => null,
      effectiveDurationSeconds: () => 0.1,
      adDurationSeconds: () => 10,
      inlineAdCount: () => 1,
      videoEndDelaySeconds: () => 0,
    }, testInjector);
    TestBed.tick();
    controller.setCursor('A');
    TestBed.tick();

    tick(100);
    tick(100);
    expect(controller.cadenceCounter()).toBe(2);

    // Operator drops the recurring — the new state has no
    // `recurringEveryXIterations` items.
    queue.set([makeContent('A', 1), makeContent('B', 2)]);
    TestBed.tick();

    expect(controller.cadenceCounter()).toBe(0);

    controller.detach();
  }));
});
