import { DisplayState, equalByDisplayFingerprint } from './display.api';

function buildBaseState(overrides: Partial<DisplayState> = {}): DisplayState {
  return {
    configuration: {
      id: 'config-1',
      name: 'Main',
      topRegionRatio: 5,
      bottomRegionRatio: 1,
      defaultTopDurationSeconds: 10,
      defaultAdDurationSeconds: 10,
      inlineAdCount: 1,
      remoteControlPollingSeconds: 5,
      videoEndDelaySeconds: 2,
      isEnabled: true
    },
    topContent: [
      { id: 'c-1', title: 'One', contentType: 'photo', sourceReference: 'https://example.com/1.jpg', isActive: true, displayOrder: 1, effectiveDurationSeconds: 10 },
      { id: 'c-2', title: 'Two', contentType: 'photo', sourceReference: 'https://example.com/2.jpg', isActive: true, displayOrder: 2, effectiveDurationSeconds: 10 }
    ],
    ads: [
      { id: 'a-1', sourceReference: 'https://example.com/a.jpg', isActive: true, displayOrder: 1, effectiveDurationSeconds: 10 }
    ],
    fallbackActive: false,
    remoteControl: {
      contentMode: 'loop',
      selectedIframeId: null,
      adsVisible: true,
      updatedAt: '2026-06-23T00:00:00Z'
    },
    ...overrides
  };
}

describe('equalByDisplayFingerprint', () => {
  it('returns false when prev is null (initial poll)', () => {
    expect(equalByDisplayFingerprint(null, buildBaseState())).toBeFalse();
  });

  it('returns true for byte-identical states', () => {
    const a = buildBaseState();
    const b = buildBaseState();
    expect(equalByDisplayFingerprint(a, b)).toBeTrue();
  });

  it('detects a recurringEveryXIterations change in topContent', () => {
    const prev = buildBaseState();
    const next = buildBaseState({
      topContent: [
        { id: 'c-1', title: 'One', contentType: 'photo', sourceReference: 'https://example.com/1.jpg', isActive: true, displayOrder: 1, effectiveDurationSeconds: 10, recurringEveryXIterations: 3 },
        { id: 'c-2', title: 'Two', contentType: 'photo', sourceReference: 'https://example.com/2.jpg', isActive: true, displayOrder: 2, effectiveDurationSeconds: 10 }
      ]
    });
    expect(equalByDisplayFingerprint(prev, next)).toBeFalse();
  });

  it('detects a cadence change from 3 to 10 on the same recurring item', () => {
    const prev = buildBaseState({
      topContent: [
        { id: 'c-1', title: 'One', contentType: 'photo', sourceReference: 'https://example.com/1.jpg', isActive: true, displayOrder: 1, effectiveDurationSeconds: 10, recurringEveryXIterations: 3 }
      ]
    });
    const next = buildBaseState({
      topContent: [
        { id: 'c-1', title: 'One', contentType: 'photo', sourceReference: 'https://example.com/1.jpg', isActive: true, displayOrder: 1, effectiveDurationSeconds: 10, recurringEveryXIterations: 10 }
      ]
    });
    expect(equalByDisplayFingerprint(prev, next)).toBeFalse();
  });

  it('detects removing the recurring flag on an item', () => {
    const prev = buildBaseState({
      topContent: [
        { id: 'c-1', title: 'One', contentType: 'photo', sourceReference: 'https://example.com/1.jpg', isActive: true, displayOrder: 1, effectiveDurationSeconds: 10, recurringEveryXIterations: 5 }
      ]
    });
    const next = buildBaseState({
      topContent: [
        { id: 'c-1', title: 'One', contentType: 'photo', sourceReference: 'https://example.com/1.jpg', isActive: true, displayOrder: 1, effectiveDurationSeconds: 10 }
      ]
    });
    expect(equalByDisplayFingerprint(prev, next)).toBeFalse();
  });

  it('detects an isActive change in topContent', () => {
    const prev = buildBaseState();
    const next = buildBaseState({
      topContent: [
        { id: 'c-1', title: 'One', contentType: 'photo', sourceReference: 'https://example.com/1.jpg', isActive: false, displayOrder: 1, effectiveDurationSeconds: 10 },
        { id: 'c-2', title: 'Two', contentType: 'photo', sourceReference: 'https://example.com/2.jpg', isActive: true, displayOrder: 2, effectiveDurationSeconds: 10 }
      ]
    });
    expect(equalByDisplayFingerprint(prev, next)).toBeFalse();
  });

  it('detects an isFixed change in topContent', () => {
    const prev = buildBaseState();
    const next = buildBaseState({
      topContent: [
        { id: 'c-1', title: 'One', contentType: 'photo', sourceReference: 'https://example.com/1.jpg', isActive: true, displayOrder: 1, effectiveDurationSeconds: 10, isFixed: true },
        { id: 'c-2', title: 'Two', contentType: 'photo', sourceReference: 'https://example.com/2.jpg', isActive: true, displayOrder: 2, effectiveDurationSeconds: 10 }
      ]
    });
    expect(equalByDisplayFingerprint(prev, next)).toBeFalse();
  });

  it('detects an isActive change in ads', () => {
    const prev = buildBaseState();
    const next = buildBaseState({
      ads: [
        { id: 'a-1', sourceReference: 'https://example.com/a.jpg', isActive: false, displayOrder: 1, effectiveDurationSeconds: 10 }
      ]
    });
    expect(equalByDisplayFingerprint(prev, next)).toBeFalse();
  });

  it('detects a jumpToContentId change in remote control', () => {
    const prev = buildBaseState();
    const next = buildBaseState({
      remoteControl: {
        contentMode: 'loop',
        selectedIframeId: null,
        adsVisible: true,
        updatedAt: '2026-06-23T00:00:00Z',
        navigationCommand: 'jump_to',
        navigationCommandId: '11111111-1111-4111-8111-111111111111',
        jumpToContentId: 'c-1'
      }
    });
    expect(equalByDisplayFingerprint(prev, next)).toBeFalse();
  });

  it('detects a navigation command id change', () => {
    const prev = buildBaseState({
      remoteControl: {
        contentMode: 'loop',
        selectedIframeId: null,
        adsVisible: true,
        updatedAt: '2026-06-23T00:00:00Z',
        navigationCommand: 'next',
        navigationCommandId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      }
    });
    const next = buildBaseState({
      remoteControl: {
        contentMode: 'loop',
        selectedIframeId: null,
        adsVisible: true,
        updatedAt: '2026-06-23T00:00:00Z',
        navigationCommand: 'next',
        navigationCommandId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
      }
    });
    expect(equalByDisplayFingerprint(prev, next)).toBeFalse();
  });

  it('detects a content removal', () => {
    const prev = buildBaseState();
    const next = buildBaseState({
      topContent: [
        { id: 'c-1', title: 'One', contentType: 'photo', sourceReference: 'https://example.com/1.jpg', isActive: true, displayOrder: 1, effectiveDurationSeconds: 10 }
      ]
    });
    expect(equalByDisplayFingerprint(prev, next)).toBeFalse();
  });

  it('detects a content addition', () => {
    const prev = buildBaseState();
    const next = buildBaseState({
      topContent: [
        { id: 'c-1', title: 'One', contentType: 'photo', sourceReference: 'https://example.com/1.jpg', isActive: true, displayOrder: 1, effectiveDurationSeconds: 10 },
        { id: 'c-2', title: 'Two', contentType: 'photo', sourceReference: 'https://example.com/2.jpg', isActive: true, displayOrder: 2, effectiveDurationSeconds: 10 },
        { id: 'c-3', title: 'Three', contentType: 'photo', sourceReference: 'https://example.com/3.jpg', isActive: true, displayOrder: 3, effectiveDurationSeconds: 10 }
      ]
    });
    expect(equalByDisplayFingerprint(prev, next)).toBeFalse();
  });
});
