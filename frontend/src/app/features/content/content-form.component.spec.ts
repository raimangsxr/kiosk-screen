import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
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

function stubRoute(id: string | null) {
  const params = id ? { id } : {};
  return {
    snapshot: { paramMap: convertToParamMap(params) },
    paramMap: of(convertToParamMap(params))
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
      throwError(() => ({
        error: { code: 'unexpected_error', message: 'Internal failure at /var/log/app.log', category: 'unexpected' }
      }))
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
      'get',
      'create',
      'createIframe',
      'update',
      'upload'
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

  function newForm(): ContentFormComponent {
    return TestBed.createComponent(ContentFormComponent).componentInstance;
  }

  function editForm(): ContentFormComponent {
    const localApi = TestBed.inject(ContentApiService);
    (localApi.get as jasmine.Spy).and.returnValue(of(buildItem({ title: 'Welcome', contentType: 'photo' })));
    return TestBed.createComponent(ContentFormComponent).componentInstance;
  }

  it('marks title as required and prevents save when invalid', () => {
    const component = newForm();
    component.ngOnInit();
    const form = component['form'];
    expect(form).not.toBeNull();
    form!.controls.title.setValue('');
    form!.controls.displayOrder.setValue(1);
    expect(form!.invalid).toBeTrue();
    component.submit();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('rejects display order that is not a positive integer', () => {
    const component = newForm();
    component.ngOnInit();
    const form = component['form']!;
    form.controls.title.setValue('Agenda');
    form.controls.displayOrder.setValue(0);
    expect(form.controls.displayOrder.hasError('positiveInteger')).toBeTrue();
    component.submit();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('submits photo content with create endpoint when no file is provided', () => {
    const component = newForm();
    component.ngOnInit();
    const form = component['form']!;
    form.controls.title.setValue('Agenda');
    form.controls.contentType.setValue('photo');
    form.controls.sourceReference.setValue('https://example.com/agenda.jpg');
    form.controls.displayOrder.setValue(2);
    component.submit();
    expect(api.create).toHaveBeenCalled();
    expect(api.upload).not.toHaveBeenCalled();
  });

  it('submits photo content with upload endpoint when a file is selected', () => {
    const component = newForm();
    component.ngOnInit();
    const form = component['form']!;
    form.controls.title.setValue('Agenda');
    form.controls.contentType.setValue('photo');
    form.controls.displayOrder.setValue(1);
    component['selectedFile'].set(new File(['x'], 'agenda.jpg', { type: 'image/jpeg' }));
    component.submit();
    expect(api.upload).toHaveBeenCalled();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('submits embedded_web content to the iframe endpoint', () => {
    const component = newForm();
    component.ngOnInit();
    const form = component['form']!;
    form.controls.title.setValue('Sponsor');
    form.controls.contentType.setValue('embedded_web');
    form.controls.sourceReference.setValue('https://example.com/embed');
    form.controls.displayOrder.setValue(3);
    component.submit();
    expect(api.createIframe).toHaveBeenCalled();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('refuses to save a photo or video without a file on create', () => {
    const component = newForm();
    component.ngOnInit();
    const form = component['form']!;
    form.controls.title.setValue('Agenda');
    form.controls.contentType.setValue('video');
    form.controls.displayOrder.setValue(1);
    component.submit();
    expect(api.upload).not.toHaveBeenCalled();
    expect(api.create).not.toHaveBeenCalled();
    const err = component['saveError']();
    expect(err?.category).toBe('validation');
  });

  it('uses update endpoint when contentId is set', () => {
    TestBed.resetTestingModule();
    api = jasmine.createSpyObj<ContentApiService>('ContentApiService', [
      'get',
      'create',
      'createIframe',
      'update',
      'upload'
    ]);
    api.get.and.returnValue(of(buildItem({ id: 'item-1', title: 'Welcome' })));
    api.update.and.returnValue(of(buildItem({ id: 'item-1', title: 'Welcome' })));
    api.upload.and.returnValue(of(buildItem({ id: 'item-1' })));
    TestBed.configureTestingModule({
      imports: [ContentFormComponent, NoopAnimationsModule],
      providers: [
        { provide: ContentApiService, useValue: api },
        { provide: ActivatedRoute, useValue: stubRoute('item-1') }
      ]
    });
    const fixture = TestBed.createComponent(ContentFormComponent);
    fixture.detectChanges();
    const form = fixture.componentInstance['form']!;
    form.controls.title.setValue('Welcome renamed');
    fixture.componentInstance.submit();
    expect(api.update).toHaveBeenCalled();
  });

  it('populates the form when an item is loaded', () => {
    TestBed.resetTestingModule();
    api = jasmine.createSpyObj<ContentApiService>('ContentApiService', [
      'get',
      'create',
      'createIframe',
      'update',
      'upload'
    ]);
    api.get.and.returnValue(of(buildItem({ title: 'Welcome', contentType: 'photo', displayOrder: 5 })));
    TestBed.configureTestingModule({
      imports: [ContentFormComponent, NoopAnimationsModule],
      providers: [
        { provide: ContentApiService, useValue: api },
        { provide: ActivatedRoute, useValue: stubRoute('item-1') }
      ]
    });
    const fixture = TestBed.createComponent(ContentFormComponent);
    fixture.detectChanges();
    expect(api.get).toHaveBeenCalledWith('item-1');
    const form = fixture.componentInstance['form']!;
    expect(form.controls.title.value).toBe('Welcome');
    expect(form.controls.displayOrder.value).toBe(5);
  });

  it('exposes a save error from the facade when the save call fails', () => {
    api.create.and.returnValue(
      throwError(() => ({ error: { code: 'validation_failed', message: 'Bad title', category: 'validation' } }))
    );
    const component = newForm();
    component.ngOnInit();
    const form = component['form']!;
    form.controls.title.setValue('Agenda');
    form.controls.contentType.setValue('photo');
    form.controls.sourceReference.setValue('https://example.com/agenda.jpg');
    form.controls.displayOrder.setValue(1);
    component.submit();
    const err = component['saveError']();
    expect(err).not.toBeNull();
    expect(err?.category).toBe('validation');
  });

  it('tracks unsaved changes after a field is edited', () => {
    const component = newForm();
    component.ngOnInit();
    expect(component.hasUnsavedChanges()).toBeFalse();
    const form = component['form']!;
    form.controls.title.setValue('New title');
    expect(component.hasUnsavedChanges()).toBeTrue();
  });

  it('reports not dirty while saving', () => {
    const component = newForm();
    component.ngOnInit();
    const form = component['form']!;
    form.controls.title.setValue('New title');
    TestBed.inject(ContentFacade)['savingState'].set(true);
    expect(component.hasUnsavedChanges()).toBeFalse();
  });
});
