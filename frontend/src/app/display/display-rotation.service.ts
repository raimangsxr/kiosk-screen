import { Injectable } from '@angular/core';

export interface OrderedDisplayItem {
  displayOrder: number;
  durationSeconds?: number | null;
  effectiveDurationSeconds?: number | null;
}

@Injectable({ providedIn: 'root' })
export class DisplayRotationService {
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
