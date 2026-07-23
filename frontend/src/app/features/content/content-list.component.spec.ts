import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Routes } from '@angular/router';
import { BreakpointObserver, BreakpointState, Breakpoints } from '@angular/cdk/layout';
import { BehaviorSubject, of } from 'rxjs';
import { Component, signal } from '@angular/core';

import { ContentListComponent } from './content-list.component';
import { ContentFacade } from './content.facade';
import { ContentItem } from '../../core/api/content.api';

/**
 * Characterization spec added before the CHG-046 structural split of the
 * content list into presentational subcomponents. It pins the observable
 * behaviour (table on desktop, cards on compact, status chips, empty state,
 * bulk-selection bar) so the extraction can be verified as behaviour-neutral.
 */

@Component({ selector: 'app-stub', standalone: true, template: '' })
class StubComponent {}

const ROUTES: Routes = [
  { path: 'admin/content/new', component: StubComponent },
  { path: 'admin/content/:id/edit', component: StubComponent }
];

class BreakpointObserverStub {
  readonly events = new BehaviorSubject<BreakpointState>({ matches: false, breakpoints: {} });
  observe() {
    return this.events.asObservable();
  }
  isMatched(): boolean {
    return false;
  }
}

function emitBreakpoints(
  observer: BreakpointObserverStub,
  breakpoints: Partial<Record<keyof typeof Breakpoints, boolean>>
): void {
  const next: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(breakpoints)) {
    next[Breakpoints[key as keyof typeof Breakpoints]] = Boolean(value);
  }
  observer.events.next({ matches: false, breakpoints: next });
}

const ITEMS: ContentItem[] = [
  {
    id: 'c1',
    title: 'Foto de bienvenida',
    contentType: 'photo',
    sourceReference: 'welcome.jpg',
    mediaFile: { mediaUrl: 'https://cdn.example/w.jpg', originalFilename: 'welcome.jpg' } as never,
    isActive: true,
    displayOrder: 1,
    isFixed: false,
    isNovelty: false
  },
  {
    id: 'c2',
    title: 'Vídeo promocional',
    contentType: 'video',
    sourceReference: 'promo.mp4',
    mediaFile: null,
    isActive: false,
    displayOrder: 2,
    isFixed: false,
    isNovelty: true
  }
];

class ContentFacadeMock {
  readonly items = signal<ContentItem[]>(ITEMS);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<{ message: string } | null>(null);
  refresh() {
    return of(this.items());
  }
  reorder() {
    return of(this.items());
  }
  remove() {
    return of(void 0);
  }
  removeMany() {
    return of(void 0);
  }
  setActiveMany() {
    return of(this.items());
  }
  showOnScreen() {
    return of(void 0);
  }
}

function configure(facade: ContentFacadeMock): BreakpointObserverStub {
  const breakpointObserver = new BreakpointObserverStub();
  TestBed.configureTestingModule({
    imports: [ContentListComponent, NoopAnimationsModule],
    providers: [
      provideRouter(ROUTES),
      { provide: ContentFacade, useValue: facade },
      { provide: BreakpointObserver, useValue: breakpointObserver }
    ]
  });
  return breakpointObserver;
}

describe('ContentListComponent (characterization)', () => {
  it('renders a table row per item with status chips on desktop', () => {
    const facade = new ContentFacadeMock();
    const observer = configure(facade);
    emitBreakpoints(observer, { Web: true, Large: true });

    const fixture = TestBed.createComponent(ContentListComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('table[mat-table]')).not.toBeNull();
    expect(el.querySelector('[data-testid="content-select-all"]')).not.toBeNull();
    const text = el.textContent ?? '';
    expect(text).toContain('Foto de bienvenida');
    expect(text).toContain('Vídeo promocional');
    expect(text).toContain('Activo');
    expect(text).toContain('Inactivo');
    expect(text).toContain('Foto');
    expect(text).toContain('Vídeo');
    expect(el.querySelectorAll('[data-testid="content-show-on-screen"]').length).toBe(2);
  });

  it('renders a card per item on compact viewports', () => {
    const facade = new ContentFacadeMock();
    const observer = configure(facade);
    emitBreakpoints(observer, { HandsetPortrait: true, XSmall: true });

    const fixture = TestBed.createComponent(ContentListComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('table[mat-table]')).toBeNull();
    expect(el.querySelectorAll('.content-list__card-item').length).toBe(2);
    expect(el.textContent).toContain('Foto de bienvenida');
  });

  it('shows the empty state when there is no content', () => {
    const facade = new ContentFacadeMock();
    facade.items.set([]);
    const observer = configure(facade);
    emitBreakpoints(observer, { Web: true, Large: true });

    const fixture = TestBed.createComponent(ContentListComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay contenido');
  });

  it('reveals the bulk-selection bar after selecting all rows', () => {
    const facade = new ContentFacadeMock();
    const observer = configure(facade);
    emitBreakpoints(observer, { Web: true, Large: true });

    const fixture = TestBed.createComponent(ContentListComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    const selectAll = el.querySelector<HTMLInputElement>(
      '[data-testid="content-select-all"] input'
    );
    selectAll?.click();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="admin-list-bulk-bar"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="content-delete-selected"]')).not.toBeNull();
  });
});
