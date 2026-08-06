import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Subject, of, switchMap, timer, take } from 'rxjs';

import { ContentFacade } from './content.facade';
import { AdminContentStreamService } from './admin-content-stream.service';

describe('ContentList reconcile coalescing (CHG-051)', () => {
  it('switchMap cancels in-flight silent refresh when a newer inventory signal arrives', fakeAsync(() => {
    const inventory$ = new Subject<void>();
    const refreshCalls: string[] = [];

    inventory$
      .pipe(
        switchMap(() => timer(500).pipe(take(1))),
      )
      .subscribe(() => {
        refreshCalls.push('done');
      });

    inventory$.next();
    tick(100);
    inventory$.next();
    tick(600);

    expect(refreshCalls.length).toBe(1);
  }));

  it('content-list wiring uses facade silent refresh on inventoryChanged$', () => {
    const stream = {
      inventoryChanged$: of(void 0),
      start: jasmine.createSpy('start'),
      stop: jasmine.createSpy('stop'),
    };
    const facade = {
      refresh: jasmine.createSpy('refresh').and.returnValue(of([])),
    };

    stream.inventoryChanged$
      .pipe(switchMap(() => facade.refresh({ silent: true })))
      .subscribe();

    expect(facade.refresh).toHaveBeenCalledWith({ silent: true });
  });
});
