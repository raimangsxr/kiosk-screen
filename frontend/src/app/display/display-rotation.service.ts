import { Injectable } from '@angular/core';

export interface OrderedDisplayItem {
  displayOrder: number;
  durationSeconds?: number | null;
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
    return orderedItems[index % orderedItems.length];
  }

  duration(item: OrderedDisplayItem | null, defaultDurationSeconds: number): number {
    return item?.durationSeconds ?? defaultDurationSeconds;
  }
}
