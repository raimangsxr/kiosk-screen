import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, Subject, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BreakpointObserver, BreakpointState, Breakpoints } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';
import { OverlayModule } from '@angular/cdk/overlay';

import { ContentApiService, ContentItem } from '../../core/api/content.api';
import { AdminContentStreamService } from './admin-content-stream.service';
import { ContentListComponent } from './content-list.component';
import { CONTENT_LIST_PAGE_SIZE_STORAGE_KEY } from '../../shared/util/client-pagination-storage';

class BreakpointObserverStub {
  readonly events = new BehaviorSubject<BreakpointState>({
    matches: false,
    breakpoints: {
      [Breakpoints.Large]: true,
      [Breakpoints.HandsetPortrait]: false,
      [Breakpoints.TabletPortrait]: false
    }
  });

  observe() {
    return this.events.asObservable();
  }
}

function buildItem(partial: Partial<ContentItem> = {}): ContentItem {
  return {
    id: 'item-1',
    title: 'Agenda',
    contentType: 'photo',
    sourceReference: 'https://example.com/agenda.jpg',
    isActive: true,
    displayOrder: 1,
    mediaFile: {
      id: 'media-1',
      mediaType: 'image',
      contentType: 'image/jpeg',
      fileSizeBytes: 1024,
      originalFilename: 'agenda.jpg',
      mediaUrl: 'https://example.com/agenda.jpg'
    },
    ...partial
  };
}

function buildItems(count: number): ContentItem[] {
  return Array.from({ length: count }, (_, index) =>
    buildItem({
      id: `item-${index + 1}`,
      title: `Item ${index + 1}`,
      displayOrder: index + 1
    })
  );
}

describe('ContentListComponent (Material)', () => {
  let fixture: ComponentFixture<ContentListComponent>;
  let api: jasmine.SpyObj<ContentApiService>;
  let stream: jasmine.SpyObj<AdminContentStreamService>;
  let inventoryChanged$: Subject<void>;
  let staleSignal: ReturnType<typeof signal<boolean>>;
  let nowPlayingContentId: ReturnType<typeof signal<string | null>>;
  let nowPlayingTitle: ReturnType<typeof signal<string | null>>;

  beforeEach(async () => {
    localStorage.clear();
    inventoryChanged$ = new Subject<void>();
    staleSignal = signal(false);
    nowPlayingContentId = signal<string | null>(null);
    nowPlayingTitle = signal<string | null>(null);
    api = jasmine.createSpyObj<ContentApiService>('ContentApiService', ['list', 'delete']);
    api.list.and.returnValue(of([buildItem()]));
    api.delete.and.returnValue(of(undefined as void));

    stream = jasmine.createSpyObj<AdminContentStreamService>(
      'AdminContentStreamService',
      ['start', 'stop', 'setDragDeferred', 'markFresh'],
      {
        inventoryChanged$: inventoryChanged$.asObservable(),
        stale: staleSignal,
        nowPlayingContentId,
        nowPlayingTitle
      }
    );

    await TestBed.configureTestingModule({
      imports: [ContentListComponent, NoopAnimationsModule, OverlayModule],
      providers: [
        { provide: ContentApiService, useValue: api },
        { provide: AdminContentStreamService, useValue: stream },
        { provide: BreakpointObserver, useValue: new BreakpointObserverStub() },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContentListComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders item title and active status', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Agenda');
    expect(text).toContain('Activo');
  });

  it('shows empty state when no items are returned', () => {
    api.list.and.returnValue(of([]));
    fixture.componentInstance['facade'].refresh().subscribe();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('No hay contenido');
  });

  it('exposes error message when list fails', () => {
    api.list.and.returnValue(
      throwError(() => ({ error: { code: 'unexpected_error', message: 'Internal failure at /var/log/app.log', category: 'unexpected' } }))
    );
    fixture.componentInstance['facade'].refresh().subscribe({ error: () => undefined });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Contenido no disponible');
    expect(text).not.toContain('/var/log/');
  });

  it('highlights pending novelty items with chip and row class', () => {
    api.list.and.returnValue(
      of([
        buildItem({ id: 'item-1', title: 'Regular', isNovelty: false }),
        buildItem({ id: 'item-2', title: 'Fresh upload', isNovelty: true })
      ])
    );
    fixture.componentInstance['pageSize'].set('all');
    fixture.componentInstance['facade'].refresh().subscribe();
    fixture.detectChanges();

    const table = fixture.nativeElement.querySelector('.content-list__table');
    const noveltyChips = Array.from(
      table.querySelectorAll('.status-chip__label') as NodeListOf<Element>
    ).filter((el) => el.textContent?.trim() === 'Nov.');
    expect(noveltyChips.length).toBe(1);

    const noveltyRow = fixture.nativeElement.querySelector('.content-list__row--novelty');
    expect(noveltyRow).not.toBeNull();
    expect(noveltyRow?.textContent).toContain('Fresh upload');
  });

  it('filters to pending novelties only and disables reorder hint', () => {
    api.list.and.returnValue(
      of([
        buildItem({ id: 'item-1', title: 'Regular', isNovelty: false }),
        buildItem({ id: 'item-2', title: 'Fresh upload', isNovelty: true })
      ])
    );
    fixture.componentInstance['pageSize'].set('all');
    fixture.componentInstance['facade'].refresh().subscribe();
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector('[data-testid="content-novelty-filter"] button') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tr.content-list__row');
    expect(rows.length).toBe(1);
    expect(rows[0]?.textContent).toContain('Fresh upload');

    const dropList = fixture.nativeElement.querySelector('.content-list__drop');
    expect(dropList.classList.contains('cdk-drop-list-disabled')).toBeTrue();
    expect(fixture.nativeElement.querySelector('[data-testid="content-novelty-filter-hint"]')).not.toBeNull();
  });

  it('uses icon-only actions with Spanish aria-labels', () => {
    const play = fixture.nativeElement.querySelector('[data-testid="content-show-on-screen"]') as HTMLButtonElement;
    expect(play).not.toBeNull();
    expect(play.className).toContain('mat-mdc-icon-button');
    expect(play.getAttribute('aria-label')).toContain('Mostrar en pantalla');
    expect(play.textContent).not.toContain('Mostrar en pantalla');
  });

  it('paginates items when page size is 10', () => {
    api.list.and.returnValue(of(buildItems(25)));
    fixture.componentInstance['facade'].refresh().subscribe();
    fixture.componentInstance['pageSize'].set(10);
    fixture.componentInstance['pageIndex'].set(0);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tr.content-list__row').length).toBe(10);
    expect(fixture.nativeElement.querySelector('[data-testid="content-page-range"]')?.textContent).toContain('1–10 de 25');
  });

  it('shows all rows when page size is Todas', () => {
    api.list.and.returnValue(of(buildItems(12)));
    fixture.componentInstance['facade'].refresh().subscribe();
    fixture.componentInstance['onPageSizeChange']('all');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tr.content-list__row').length).toBe(12);
    expect(fixture.nativeElement.querySelector('[data-testid="content-page-prev"]')).toBeNull();
  });

  it('clears selection when changing page', () => {
    api.list.and.returnValue(of(buildItems(15)));
    fixture.componentInstance['facade'].refresh().subscribe();
    fixture.componentInstance['onPageSizeChange'](10);
    fixture.detectChanges();

    fixture.componentInstance['toggleSelection']('item-1', true);
    fixture.detectChanges();
    expect(fixture.componentInstance['selection']().size).toBe(1);

    fixture.componentInstance['goToNextPage']();
    fixture.detectChanges();
    expect(fixture.componentInstance['selection']().size).toBe(0);
  });

  it('disables drag reorder when page size is not Todas', () => {
    api.list.and.returnValue(of(buildItems(15)));
    fixture.componentInstance['facade'].refresh().subscribe();
    fixture.componentInstance['onPageSizeChange'](10);
    fixture.detectChanges();

    const dropList = fixture.nativeElement.querySelector('.content-list__drop');
    expect(dropList.classList.contains('cdk-drop-list-disabled')).toBeTrue();
    expect(fixture.nativeElement.querySelector('[data-testid="content-pagination-reorder-hint"]')).not.toBeNull();
  });

  it('opens hover preview on thumbnail focus within 500ms', fakeAsync(() => {
    const trigger = fixture.nativeElement.querySelector('[data-testid="content-thumbnail-trigger"]') as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    trigger.dispatchEvent(new FocusEvent('focus'));
    tick(100);
    fixture.detectChanges();
    expect(document.querySelector('[data-testid="media-hover-preview-image"]')).not.toBeNull();
    fixture.componentInstance['onEscape']();
    tick(100);
    fixture.detectChanges();
    expect(document.querySelector('[data-testid="media-hover-preview-image"]')).toBeNull();
  }));

  it('persists page size in localStorage', () => {
    fixture.componentInstance['onPageSizeChange'](50);
    expect(localStorage.getItem(CONTENT_LIST_PAGE_SIZE_STORAGE_KEY)).toBe('50');
  });

  it('clicking refresh triggers facade reload', () => {
    api.list.calls.reset();
    const button = fixture.nativeElement.querySelector('[data-testid="admin-list-refresh"]') as HTMLButtonElement;
    expect(button).not.toBeNull();
    button.click();
    expect(api.list).toHaveBeenCalled();
  });

  it('starts admin content stream on init and stops on destroy', () => {
    expect(stream.start).toHaveBeenCalled();
    fixture.destroy();
    expect(stream.stop).toHaveBeenCalled();
  });

  it('simulated stream event triggers silent list reload without skeleton', fakeAsync(() => {
    api.list.calls.reset();
    api.list.and.returnValue(
      of([
        buildItem({ id: 'item-1', title: 'Before' }),
        buildItem({ id: 'item-2', title: 'After remote', isNovelty: true })
      ])
    );
    inventoryChanged$.next();
    tick(1000);
    fixture.detectChanges();
    expect(api.list).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[data-testid="admin-list-skeleton"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('After remote');
  }));

  it('highlights on-air row when nowPlayingContentId matches', () => {
    api.list.and.returnValue(
      of([
        buildItem({ id: 'item-1', title: 'Regular' }),
        buildItem({ id: 'item-2', title: 'On Air', isNovelty: true })
      ])
    );
    fixture.componentInstance['pageSize'].set('all');
    fixture.componentInstance['facade'].refresh().subscribe();
    nowPlayingContentId.set('item-2');
    nowPlayingTitle.set('On Air');
    fixture.detectChanges();

    const onAirRow = fixture.nativeElement.querySelector('.content-list__row--on-air');
    expect(onAirRow).not.toBeNull();
    expect(onAirRow?.textContent).toContain('On Air');
    expect(onAirRow?.classList.contains('content-list__row--novelty')).toBeFalse();
  });

  it('shows off-page hint when on-air item is not visible', () => {
    api.list.and.returnValue(of(buildItems(25)));
    nowPlayingContentId.set('item-15');
    nowPlayingTitle.set('Item 15');
    fixture.componentInstance['facade'].refresh().subscribe();
    fixture.componentInstance['onPageSizeChange'](10);
    fixture.detectChanges();

    const hint = fixture.nativeElement.querySelector('[data-testid="content-on-air-hint"]');
    expect(hint).not.toBeNull();
    expect(hint?.textContent).toContain('En pantalla: Item 15');
    expect(fixture.nativeElement.querySelectorAll('.content-list__row--on-air').length).toBe(0);
  });
});
