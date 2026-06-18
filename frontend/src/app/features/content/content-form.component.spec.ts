import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ContentApiService, ContentItem } from '../../content/content-api.service';
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
      providers: [{ provide: ContentApiService, useValue: api }, provideRouter([])]
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
});

describe('ContentFormComponent (Reactive Forms + Material)', () => {
  let fixture: ComponentFixture<ContentFormComponent>;
  let api: jasmine.SpyObj<ContentApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<ContentApiService>('ContentApiService', [
      'get', 'create', 'createIframe', 'update', 'upload'
    ]);
    api.create.and.returnValue(of(buildItem()));
    api.createIframe.and.returnValue(of(buildItem({ contentType: 'embedded_web' })));
    api.update.and.returnValue(of(buildItem()));
    api.upload.and.returnValue(of(buildItem()));
    api.get.and.returnValue(of(buildItem()));

    await TestBed.configureTestingModule({
      imports: [ContentFormComponent, NoopAnimationsModule],
      providers: [{ provide: ContentApiService, useValue: api }, provideRouter([])]
    }).compileComponents();
  });

  it('marks title as required and prevents save when invalid', () => {
    const fixture = TestBed.createComponent(ContentFormComponent);
    fixture.componentInstance.ngOnInit();
    const form = fixture.componentInstance['form']!;
    form.controls.title.setValue('');
    form.controls.displayOrder.setValue(1);
    expect(form.invalid).toBeTrue();
    fixture.componentInstance.submit();
    expect(api.create).not.toHaveBeenCalled();
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
    expect(api.create).not.toHaveBeenCalled();
  });

  it('submits embedded_web content to the iframe endpoint', () => {
    const fixture = TestBed.createComponent(ContentFormComponent);
    fixture.componentInstance.ngOnInit();
    const form = fixture.componentInstance['form']!;
    form.controls.title.setValue('Sponsor');
    form.controls.contentType.setValue('embedded_web');
    form.controls.sourceReference.setValue('https://example.com/embed');
    form.controls.displayOrder.setValue(3);
    fixture.componentInstance.submit();
    expect(api.createIframe).toHaveBeenCalled();
    expect(api.create).not.toHaveBeenCalled();
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
    form.controls.title.setValue('New title');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
  });
});
