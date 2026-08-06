import { TestBed } from '@angular/core/testing';

import { DisplayMediaCacheService } from './display-media-cache.service';
import { NoveltyQueueTrackerService } from './novelty-queue-tracker.service';
import type { PreloadItem } from './display-stream.models';

describe('NoveltyQueueTrackerService', () => {
  let tracker: NoveltyQueueTrackerService;

  const items: PreloadItem[] = [
    {
      contentId: 'n1',
      mediaUrl: '/api/media/n1.jpg',
      contentType: 'photo',
      mediaVersion: 'n1',
      isNovelty: true,
    },
    {
      contentId: 'n2',
      mediaUrl: '/api/media/n2.mp4',
      contentType: 'video',
      mediaVersion: 'n2',
      isNovelty: true,
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NoveltyQueueTrackerService,
        {
          provide: DisplayMediaCacheService,
          useValue: {
            ensureReady: () => Promise.resolve('blob:cached'),
            getReadyState: () => 'ready',
          },
        },
      ],
    });
    tracker = TestBed.inject(NoveltyQueueTrackerService);
  });

  it('tracks preload novelties and removes on commit', () => {
    tracker.syncFromPreload(items);
    expect(tracker.visibleIcons().length).toBe(2);
    tracker.removeOnCommit('n1');
    expect(tracker.visibleIcons().length).toBe(1);
  });

  it('computes overflow for more than five novelties', () => {
    const many = Array.from({ length: 6 }, (_, index) => ({
      contentId: `n${index}`,
      mediaUrl: `/api/media/n${index}.jpg`,
      contentType: 'photo',
      mediaVersion: `n${index}`,
      isNovelty: true,
    }));
    tracker.syncFromPreload(many);
    expect(tracker.visibleIcons().length).toBe(5);
    expect(tracker.overflowCount()).toBe(1);
  });

  it('backfills from snapshot pending novelties', () => {
    tracker.syncFromSnapshot(items);
    expect(tracker.hasEntries()).toBeTrue();
  });

  it('marks error when cache reports failure', async () => {
    const cache = TestBed.inject(DisplayMediaCacheService) as unknown as {
      ensureReady: () => Promise<string>;
      getReadyState: () => string;
    };
    cache.getReadyState = () => 'failed';
    cache.ensureReady = () => Promise.reject(new Error('failed'));
    tracker.syncFromPreload([items[0]]);
    await Promise.resolve();
    expect(tracker.visibleIcons()[0].downloadStatus).toBe('error');
  });
});
