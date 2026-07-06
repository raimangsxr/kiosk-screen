import { DisplayAdItem, DisplayContentItem, DisplayKioskConfiguration } from '../core/api/display.api';
import {
  sameAdsState,
  sameDisplayConfiguration,
  sameTopContentState
} from './display-fingerprint';

function makeContent(id: string, displayOrder: number, overrides: Partial<DisplayContentItem> = {}): DisplayContentItem {
  return {
    id,
    title: id,
    contentType: 'photo',
    sourceReference: `${id}.jpg`,
    isActive: true,
    displayOrder,
    durationSeconds: 10,
    recurringEveryXIterations: null,
    isFixed: false,
    ...overrides
  };
}

function makeAd(id: string, displayOrder: number, overrides: Partial<DisplayAdItem> = {}): DisplayAdItem {
  return {
    id,
    sourceReference: `${id}.jpg`,
    isActive: true,
    displayOrder,
    durationSeconds: 10,
    advertiser: 'Sponsor',
    ...overrides
  };
}

function makeConfig(overrides: Partial<DisplayKioskConfiguration> = {}): DisplayKioskConfiguration {
  return {
    id: 'config-1',
    name: 'Main',
    topRegionRatio: 5,
    bottomRegionRatio: 1,
    defaultTopDurationSeconds: 10,
    defaultAdDurationSeconds: 10,
    isEnabled: true,
    ...overrides
  };
}

describe('sameTopContentState', () => {
  it('returns true for identical queues', () => {
    const a = [makeContent('a', 1), makeContent('b', 2)];
    const b = [makeContent('a', 1), makeContent('b', 2)];
    expect(sameTopContentState(a, b)).toBeTrue();
  });

  it('returns false when lengths differ', () => {
    expect(sameTopContentState([makeContent('a', 1)], [])).toBeFalse();
  });

  it('returns false when an item id moves', () => {
    const a = [makeContent('a', 1), makeContent('b', 2)];
    const b = [makeContent('a', 1), makeContent('c', 2)];
    expect(sameTopContentState(a, b)).toBeFalse();
  });

  it('returns false when an item id is the same but displayOrder changes', () => {
    const a = [makeContent('a', 1), makeContent('b', 2)];
    const b = [makeContent('a', 2), makeContent('b', 1)];
    expect(sameTopContentState(a, b)).toBeFalse();
  });

  it('returns false when isActive flips', () => {
    const a = [makeContent('a', 1)];
    const b = [makeContent('a', 1, { isActive: false })];
    expect(sameTopContentState(a, b)).toBeFalse();
  });

  it('returns false when isFixed flips', () => {
    const a = [makeContent('a', 1, { isFixed: false })];
    const b = [makeContent('a', 1, { isFixed: true })];
    expect(sameTopContentState(a, b)).toBeFalse();
  });

  it('returns false when recurringEveryXIterations changes', () => {
    const a = [makeContent('a', 1, { recurringEveryXIterations: null })];
    const b = [makeContent('a', 1, { recurringEveryXIterations: 3 })];
    expect(sameTopContentState(a, b)).toBeFalse();
  });

  it('returns false when sourceReference changes on the same id', () => {
    const a = [makeContent('a', 1, { sourceReference: 'https://example.com/a.jpg' })];
    const b = [makeContent('a', 1, { sourceReference: 'https://example.com/b.jpg' })];
    expect(sameTopContentState(a, b)).toBeFalse();
  });

  it('returns false when mediaFile.mediaUrl changes on the same id', () => {
    const a = [makeContent('a', 1, { mediaFile: { id: 'm1', mediaType: 'image', contentType: 'image/png', fileSizeBytes: 1, originalFilename: '1.jpg', mediaUrl: 'https://cdn.example.com/1.jpg' } })];
    const b = [makeContent('a', 1, { mediaFile: { id: 'm1', mediaType: 'image', contentType: 'image/png', fileSizeBytes: 1, originalFilename: '2.jpg', mediaUrl: 'https://cdn.example.com/2.jpg' } })];
    expect(sameTopContentState(a, b)).toBeFalse();
  });

  it('returns false when effectiveDurationSeconds changes on the same id', () => {
    const a = [makeContent('a', 1, { effectiveDurationSeconds: 10 })];
    const b = [makeContent('a', 1, { effectiveDurationSeconds: 20 })];
    expect(sameTopContentState(a, b)).toBeFalse();
  });

  it('returns true when only immaterial fields such as title would differ', () => {
    const a = [makeContent('a', 1, { title: 'Before' })];
    const b = [makeContent('a', 1, { title: 'After' })];
    expect(sameTopContentState(a, b)).toBeTrue();
  });
});

describe('sameAdsState', () => {
  it('returns true for identical queues', () => {
    const a = [makeAd('a', 1), makeAd('b', 2)];
    const b = [makeAd('a', 1), makeAd('b', 2)];
    expect(sameAdsState(a, b)).toBeTrue();
  });

  it('returns false when an ad is deactivated', () => {
    const a = [makeAd('a', 1)];
    const b = [makeAd('a', 1, { isActive: false })];
    expect(sameAdsState(a, b)).toBeFalse();
  });

  it('returns false when display order changes', () => {
    const a = [makeAd('a', 1), makeAd('b', 2)];
    const b = [makeAd('a', 2), makeAd('b', 1)];
    expect(sameAdsState(a, b)).toBeFalse();
  });
});

describe('sameDisplayConfiguration', () => {
  it('returns true for identical configs', () => {
    expect(sameDisplayConfiguration(makeConfig(), makeConfig())).toBeTrue();
  });

  it('returns false when isEnabled flips', () => {
    expect(sameDisplayConfiguration(makeConfig({ isEnabled: true }), makeConfig({ isEnabled: false }))).toBeFalse();
  });

  it('returns false when region ratio changes', () => {
    expect(sameDisplayConfiguration(makeConfig({ topRegionRatio: 5 }), makeConfig({ topRegionRatio: 6 }))).toBeFalse();
  });

  it('returns false when polling interval changes', () => {
    expect(sameDisplayConfiguration(makeConfig({ remoteControlPollingSeconds: 5 }), makeConfig({ remoteControlPollingSeconds: 3 }))).toBeFalse();
  });

  it('returns false when sponsor item border styling changes', () => {
    expect(
      sameDisplayConfiguration(makeConfig({ inlineAdItemBorderRadiusPx: 5 }), makeConfig({ inlineAdItemBorderRadiusPx: 8 })),
    ).toBeFalse();
    expect(
      sameDisplayConfiguration(makeConfig({ inlineAdItemBorderWidthPx: 0 }), makeConfig({ inlineAdItemBorderWidthPx: 2 })),
    ).toBeFalse();
    expect(
      sameDisplayConfiguration(makeConfig({ inlineAdItemBorderColor: '#ffffff' }), makeConfig({ inlineAdItemBorderColor: '#102832' })),
    ).toBeFalse();
  });
});