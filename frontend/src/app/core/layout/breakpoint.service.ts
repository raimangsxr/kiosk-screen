import { Injectable, Signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs/operators';

export type SizeClass = 'compact' | 'medium' | 'expanded';

export interface AdminLayoutSignals {
  readonly sizeClass: Signal<SizeClass>;
  readonly isCompact: Signal<boolean>;
  readonly isMedium: Signal<boolean>;
  readonly isExpanded: Signal<boolean>;
  readonly isHandset: Signal<boolean>;
  readonly isTablet: Signal<boolean>;
  readonly isDesktop: Signal<boolean>;
  readonly isHandsetOrTablet: Signal<boolean>;
  readonly columnsForGrid: Signal<1 | 2 | 3>;
}

@Injectable({ providedIn: 'root' })
export class BreakpointService {
  private readonly observer = inject(BreakpointObserver);

  private readonly state = toSignal(
    this.observer.observe([
      Breakpoints.HandsetPortrait,
      Breakpoints.HandsetLandscape,
      Breakpoints.TabletPortrait,
      Breakpoints.TabletLandscape,
      Breakpoints.Web,
      Breakpoints.WebLandscape,
      Breakpoints.WebPortrait,
      Breakpoints.XSmall,
      Breakpoints.Small,
      Breakpoints.Medium,
      Breakpoints.Large,
      Breakpoints.XLarge
    ]).pipe(
      map((result) => ({
        handsetPortrait: result.breakpoints[Breakpoints.HandsetPortrait],
        handsetLandscape: result.breakpoints[Breakpoints.HandsetLandscape],
        tabletPortrait: result.breakpoints[Breakpoints.TabletPortrait],
        tabletLandscape: result.breakpoints[Breakpoints.TabletLandscape],
        web: result.breakpoints[Breakpoints.Web],
        xSmall: result.breakpoints[Breakpoints.XSmall],
        small: result.breakpoints[Breakpoints.Small],
        medium: result.breakpoints[Breakpoints.Medium],
        large: result.breakpoints[Breakpoints.Large],
        xLarge: result.breakpoints[Breakpoints.XLarge]
      }))
    ),
    {
      initialValue: {
        handsetPortrait: false,
        handsetLandscape: false,
        tabletPortrait: false,
        tabletLandscape: false,
        web: true,
        xSmall: false,
        small: false,
        medium: false,
        large: true,
        xLarge: false
      }
    }
  );

  readonly sizeClass: Signal<SizeClass> = computed(() => {
    const s = this.state();
    if (s.xLarge || s.large) {
      return 'expanded';
    }
    if (s.medium) {
      return 'medium';
    }
    return 'compact';
  });

  readonly isCompact = computed(() => this.sizeClass() === 'compact');
  readonly isMedium = computed(() => this.sizeClass() === 'medium');
  readonly isExpanded = computed(() => this.sizeClass() === 'expanded');

  readonly isHandset = computed(() => {
    const s = this.state();
    return s.handsetPortrait || s.handsetLandscape;
  });

  readonly isTablet = computed(() => {
    const s = this.state();
    return s.tabletPortrait || s.tabletLandscape;
  });

  readonly isDesktop = computed(() => this.state().web);

  readonly isHandsetOrTablet = computed(() => this.isHandset() || this.isTablet());

  readonly columnsForGrid: Signal<1 | 2 | 3> = computed(() => {
    if (this.isExpanded()) {
      return 3;
    }
    if (this.isMedium()) {
      return 2;
    }
    return 1;
  });
}
