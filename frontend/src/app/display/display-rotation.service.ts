import { Injectable } from '@angular/core';

import { DisplayContentItem } from '../core/api/display.api';

export interface OrderedDisplayItem {
  displayOrder: number;
  durationSeconds?: number | null;
  effectiveDurationSeconds?: number | null;
}

@Injectable({ providedIn: 'root' })
export class DisplayRotationService {
  /**
   * Pending novelty items in display order (CHG-027). Server-backed via
   * ``isNovelty`` on polled display state; kiosks claim atomically on show.
   */
  pendingNovelties(
    items: readonly DisplayContentItem[],
    skipIds: ReadonlySet<string> = new Set(),
  ): DisplayContentItem[] {
    return [...items]
      .filter((item) => item.isNovelty === true && !skipIds.has(item.id))
      .sort((left, right) => left.displayOrder - right.displayOrder);
  }

  pickNext(queue: DisplayContentItem[], currentId: string | null): DisplayContentItem | null {
    return this._pickNextInQueue(queue, currentId);
  }

  pickPrevious(queue: DisplayContentItem[], currentId: string | null): DisplayContentItem | null {
    return this._pickPreviousInQueue(queue, currentId);
  }

  private _pickNextInQueue(queue: DisplayContentItem[], currentId: string | null): DisplayContentItem | null {
    if (queue.length === 0) return null;
    const idx = currentId ? queue.findIndex((i) => i.id === currentId) : -1;
    const nextIndex = idx < 0 ? 0 : (idx + 1) % queue.length;
    return queue[nextIndex] ?? null;
  }

  private _pickPreviousInQueue(queue: DisplayContentItem[], currentId: string | null): DisplayContentItem | null {
    if (queue.length === 0) return null;
    const idx = currentId ? queue.findIndex((i) => i.id === currentId) : 0;
    const previousIndex = idx <= 0 ? queue.length - 1 : idx - 1;
    return queue[previousIndex] ?? null;
  }

  ordered<T extends OrderedDisplayItem>(items: T[]): T[] {
    return [...items].sort((left, right) => left.displayOrder - right.displayOrder);
  }

  current<T extends OrderedDisplayItem>(items: T[], index: number): T | null {
    const orderedItems = this.ordered(items);
    if (orderedItems.length === 0) {
      return null;
    }
    const wrapped = ((index % orderedItems.length) + orderedItems.length) % orderedItems.length;
    return orderedItems[wrapped];
  }

  duration(item: OrderedDisplayItem | null, defaultDurationSeconds: number): number {
    return item?.effectiveDurationSeconds ?? item?.durationSeconds ?? defaultDurationSeconds;
  }
}
