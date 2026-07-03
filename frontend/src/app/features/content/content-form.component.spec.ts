import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ContentApiService, ContentItem } from '../../core/api/content.api';
import { ContentFacade } from './content.facade';
import { ContentListComponent } from './content-list.component';
import { ContentFormComponent } from './content-form.component';

function buildItem(partial: Partial<ContentItem> = {}): ContentItem {
  return {
    id: 'item-1',
    title: 'Agenda',
    contentType: 'photo',
    sourceReference: 'https://example.com/agenda.jpg',
    isActive: true,
    displayOrder: 1,
    ...partial
  };
}

describe('ContentListComponent (Material)', () => {
  let fixture: ComponentFixture<ContentListComponent>;
  let api: jasmine.SpyObj<ContentApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<ContentApiService>('ContentApiService', ['list', 'delete']);
    api.list.and.returnValue(of([buildItem()]));
    api.delete.and.returnValue(of(undefined as void));

    await TestBed.configureTestingModule({
      imports: [ContentListComponent, NoopAnimationsModule],
      providers: [
        { provide: ContentApiService, useValue: api },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContentListComponent);
    fixture.detectChanges();
  });

  it('renders item title and active status', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Agenda');
    expect(text).toContain('Active');
  });

  it('shows empty state when no items are returned', () => {
    api.list.and.returnValue(of([]));
    fixture.componentInstance['facade'].refresh().subscribe();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('No content yet');
  });

  it('exposes error message when list fails', () => {
    api.list.and.returnValue(
      throwError(() => ({ error: { code: 'unexpected_error', message: 'Internal failure at /var/log/app.log', category: 'unexpected' } }))
    );
    fixture.componentInstance['facade'].refresh().subscribe({ error: () => undefined });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Content unavailable');
    expect(text).not.toContain('/var/log/');
  });

  it('highlights pending novelty items with chip and row class', () => {
    api.list.and.returnValue(
      of([
        buildItem({ id: 'item-1', title: 'Regular', isNovelty: false }),
        buildItem({ id: 'item-2', title: 'Fresh upload', isNovelty: true })
      ])
    );
    fixture.componentInstance['facade'].refresh().subscribe();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Novedad');
    expect(text).toContain('Fresh upload');
    expect(text).toContain('Regular');

    const table = fixture.nativeElement.querySelector('.content-list__table');
    const noveltyChips = Array.from(
      table.querySelectorAll('.status-chip__label') as NodeListOf<Element>
    ).filter((el) => el.textContent?.trim() === 'Novedad');
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

    toggle.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tr.content-list__row').length).toBe(2);
    expect(fixture.nativeElement.querySelector('[data-testid="content-novelty-filter-hint"]')).toBeNull();
  });
});

describe('ContentFormComponent (Reactive Forms + Material)', () => {
  let fixture: ComponentFixture<ContentFormComponent>;
  let api: jasmine.SpyObj<ContentApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<ContentApiService>('ContentApiService', [
      'list', 'get', 'create', 'update', 'upload'
    ]);
    api.list.and.returnValue(of([buildItem()]));
    api.create.and.returnValue(of(buildItem()));
    api.update.and.returnValue(of(buildItem()));
    api.upload.and.returnValue(of(buildItem()));
    api.get.and.returnValue(of(buildItem()));

    await TestBed.configureTestingModule({
      imports: [ContentFormComponent, NoopAnimationsModule],
      providers: [
        { provide: ContentApiService, useValue: api },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
  });

  it('does not render a title field for top content', () => {
    const fixture = TestBed.createComponent(ContentFormComponent);
    fixture.componentInstance.ngOnInit();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input[formControlName="title"]');
    expect(input).toBeNull();
  });

  it('rejects display order that is not a positive integer', () => {
    const fixture = TestBed.createComponent(ContentFormComponent);
    fixture.componentInstance.ngOnInit();
    const form = fixture.componentInstance['form']!;
    form.controls.title.setValue('Agenda');
    form.controls.displayOrder.setValue(0);
    expect(form.controls.displayOrder.hasError('positiveInteger')).toBeTrue();
    fixture.componentInstance.submit();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('submits photo content with create endpoint when a source reference is provided', () => {
    const fixture = TestBed.createComponent(ContentFormComponent);
    fixture.componentInstance.ngOnInit();
    const form = fixture.componentInstance['form']!;
    form.controls.title.setValue('Agenda');
    form.controls.contentType.setValue('photo');
    form.controls.sourceReference.setValue('https://example.com/agenda.jpg');
    form.controls.displayOrder.setValue(2);
    fixture.componentInstance.submit();
    expect(api.create).toHaveBeenCalled();
    expect(api.create.calls.mostRecent().args[0].title).toBe('example.com');
    expect(api.upload).not.toHaveBeenCalled();
  });

  it('submits photo content with upload endpoint when a file is selected', () => {
    const fixture = TestBed.createComponent(ContentFormComponent);
    fixture.componentInstance.ngOnInit();
    const form = fixture.componentInstance['form']!;
    form.controls.title.setValue('Agenda');
    form.controls.contentType.setValue('photo');
    form.controls.displayOrder.setValue(1);
    fixture.componentInstance['selectedFile'].set(new File(['x'], 'agenda.jpg', { type: 'image/jpeg' }));
    fixture.componentInstance.submit();
    expect(api.upload).toHaveBeenCalled();
    expect(api.upload.calls.mostRecent().args[0].title).toBe('agenda');
    expect(api.create).not.toHaveBeenCalled();
  });

  it('uploads each selected file when multiple files are selected on create', () => {
    const fixture = TestBed.createComponent(ContentFormComponent);
    fixture.componentInstance.ngOnInit();
    const form = fixture.componentInstance['form']!;
    form.controls.contentType.setValue('photo');
    form.controls.displayOrder.setValue(1);
    fixture.componentInstance['selectedFiles'].set([
      new File(['x'], 'agenda.jpg', { type: 'image/jpeg' }),
      new File(['y'], 'menu.png', { type: 'image/png' })
    ]);

    fixture.componentInstance.submit();

    expect(api.upload).toHaveBeenCalledTimes(2);
    expect(api.upload.calls.argsFor(0)[0].title).toBe('agenda');
    expect(api.upload.calls.argsFor(1)[0].title).toBe('menu');
    expect(api.list).toHaveBeenCalledTimes(1);
  });

  it('does not render the embedded iframe content type', () => {
    const fixture = TestBed.createComponent(ContentFormComponent);
    fixture.componentInstance.ngOnInit();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toContain('Embedded web');
  });

  it('refuses to save a photo or video without a file or source on create', () => {
    const fixture = TestBed.createComponent(ContentFormComponent);
    fixture.componentInstance.ngOnInit();
    const form = fixture.componentInstance['form']!;
    form.controls.title.setValue('Agenda');
    form.controls.contentType.setValue('video');
    form.controls.displayOrder.setValue(1);
    fixture.componentInstance.submit();
    expect(api.upload).not.toHaveBeenCalled();
    expect(api.create).not.toHaveBeenCalled();
    const err = fixture.componentInstance['saveError']();
    expect(err?.category).toBe('validation');
  });

  it('tracks unsaved changes after a field is edited', () => {
    const fixture = TestBed.createComponent(ContentFormComponent);
    fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
    const form = fixture.componentInstance['form']!;
    form.controls.contentType.setValue('video');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
  });
});
