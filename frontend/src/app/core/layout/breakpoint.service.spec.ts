import { TestBed } from '@angular/core/testing';
import { BreakpointObserver, BreakpointState, Breakpoints } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';

import { BreakpointService } from './breakpoint.service';

class BreakpointObserverStub {
  readonly events = new BehaviorSubject<BreakpointState>({
    matches: false,
    breakpoints: {}
  });

  observe() {
    return this.events.asObservable();
  }

  isMatched(_query: string | string[]): boolean {
    return false;
  }
}

function emitState(observer: BreakpointObserverStub, breakpoints: Partial<Record<keyof typeof Breakpoints, boolean>>): void {
  const next: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(breakpoints)) {
    next[Breakpoints[key as keyof typeof Breakpoints]] = Boolean(value);
  }
  observer.events.next({
    matches: false,
    breakpoints: next
  });
}

describe('BreakpointService', () => {
  let service: BreakpointService;
  let observerStub: BreakpointObserverStub;

  beforeEach(() => {
    observerStub = new BreakpointObserverStub();
    TestBed.configureTestingModule({
      providers: [
        BreakpointService,
        { provide: BreakpointObserver, useValue: observerStub }
      ]
    });
    service = TestBed.inject(BreakpointService);
  });

  it('reports the compact size class for handset viewports', () => {
    emitState(observerStub, {
      HandsetPortrait: true,
      XSmall: true,
      Small: false,
      Medium: false,
      Large: false,
      XLarge: false
    });

    expect(service.sizeClass()).toBe('compact');
    expect(service.isCompact()).toBeTrue();
    expect(service.isHandset()).toBeTrue();
    expect(service.columnsForGrid()).toBe(1);
  });

  it('reports the medium size class for tablet viewports', () => {
    emitState(observerStub, {
      HandsetPortrait: false,
      TabletPortrait: true,
      XSmall: false,
      Small: false,
      Medium: true,
      Large: false,
      XLarge: false
    });

    expect(service.sizeClass()).toBe('medium');
    expect(service.isMedium()).toBeTrue();
    expect(service.isHandsetOrTablet()).toBeTrue();
    expect(service.columnsForGrid()).toBe(2);
  });

  it('reports the expanded size class for desktop viewports', () => {
    emitState(observerStub, {
      HandsetPortrait: false,
      Web: true,
      XSmall: false,
      Small: false,
      Medium: false,
      Large: true,
      XLarge: false
    });

    expect(service.sizeClass()).toBe('expanded');
    expect(service.isExpanded()).toBeTrue();
    expect(service.isDesktop()).toBeTrue();
    expect(service.columnsForGrid()).toBe(3);
  });
});
