import { Injectable } from '@angular/core';

import { DisplayContentItem } from '../core/api/display.api';

export interface OrderedDisplayItem {
  displayOrder: number;
  durationSeconds?: number | null;
  effectiveDurationSeconds?: number | null;
}

export interface KioskDisplayState {
  ids: string[];
  items: DisplayContentItem[];
}

@Injectable({ providedIn: 'root' })
export class DisplayRotationService {
  /**
   * State machine for the kiosk novelty queue (spec 009 US3).
   *
   * Holds:
   * - `currentItemId` — the id of the item currently being shown (null before open).
   * - `baseAnchorId` — the id of the last base item shown before the novelty
   *   queue started. Used to resume the base rotation at the correct position
   *   after the queue drains.
   * - `noveltyQueue` — FIFO of items detected as new since the last reset; drained
   *   before returning to the base rotation.
   * - `seenIds` — set of all ids observed; used to detect additions and removals
   *   across polls.
   *
   * Pure functions for testing. The display screen component owns the timer
   * scheduling; this service is the deterministic "what next" computation.
   */
  private currentItemId: string | null = null;
  private baseAnchorId: string | null = null;
  private noveltyQueue: DisplayContentItem[] = [];
  private seenIds: Set<string> = new Set();
  private fullState: DisplayContentItem[] = [];

  reset(): void {
    this.currentItemId = null;
    this.baseAnchorId = null;
    this.noveltyQueue = [];
    this.seenIds = new Set();
    this.fullState = [];
  }

  initialize(items: DisplayContentItem[]): void {
    this.reset();
    this.fullState = [...items];
    this.seenIds = new Set(items.map((i) => i.id));
    this.currentItemId = items.length > 0 ? items[0].id : null;
    this.baseAnchorId = this.currentItemId;
  }

  applyPollState(items: DisplayContentItem[]): void {
    const previousId = this.currentItemId;
    const previousBaseAnchor = this.baseAnchorId;
    const newIds = new Set(items.map((i) => i.id));

    // Detect removals first so the novelty queue does not reference stale ids.
    this.noveltyQueue = this.noveltyQueue.filter((i) => newIds.has(i.id));

    // Detect additions: any id that is in newIds but not in seenIds, in displayOrder.
    const seen = this.seenIds;
    const additions: DisplayContentItem[] = [];
    for (const item of items) {
      if (!seen.has(item.id)) {
        additions.push(item);
      }
    }
    // The base anchor is the last base item shown. As long as it is still in the
    // state, keep it; otherwise anchor on whatever was just being shown.
    if (previousBaseAnchor && newIds.has(previousBaseAnchor)) {
      // Keep the anchor.
    } else if (previousId && newIds.has(previousId) && additions.length === 0) {
      // The current item is still in state and no new arrivals → the anchor
      // tracks the current position.
      this.baseAnchorId = previousId;
    } else {
      this.baseAnchorId = previousId ?? previousBaseAnchor;
    }

    for (const item of additions) {
      this.noveltyQueue.push(item);
    }

    this.fullState = [...items];
    this.seenIds = newIds;

    // If the currently-displayed item was removed, force a re-pick on next tick.
    if (previousId && !newIds.has(previousId)) {
      this.currentItemId = null;
    }
  }

  pickNext(defaultItem: DisplayContentItem | null = null): DisplayContentItem | null {
    if (this.noveltyQueue.length > 0) {
      const next = this.noveltyQueue.shift()!;
      this.currentItemId = next.id;
      return next;
    }
    if (this.fullState.length === 0) {
      this.currentItemId = null;
      return defaultItem;
    }
    // Determine the next base item: advance from the base anchor.
    const anchorId = this.baseAnchorId ?? this.currentItemId;
    const anchorIndex = anchorId
      ? this.fullState.findIndex((i) => i.id === anchorId)
      : -1;
    const nextIndex = (anchorIndex + 1) % this.fullState.length;
    const next = this.fullState[nextIndex];
    this.currentItemId = next.id;
    this.baseAnchorId = next.id;
    return next;
  }

  getCurrentItemId(): string | null {
    return this.currentItemId;
  }

  getNoveltyQueueLength(): number {
    return this.noveltyQueue.length;
  }

  getFullState(): DisplayContentItem[] {
    return this.fullState;
  }

  // ---- Legacy helpers kept for the existing rotation API ---------------------

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
