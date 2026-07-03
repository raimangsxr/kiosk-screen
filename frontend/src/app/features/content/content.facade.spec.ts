import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { ContentApiService, ContentItem } from '../../core/api/content.api';
import { ContentFacade } from './content.facade';
import { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

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

describe('ContentFacade', () => {
  let facade: ContentFacade;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ContentFacade]
    });
    facade = TestBed.inject(ContentFacade);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('refresh exposes loaded items through items and ready signals', () => {
    const items = [buildItem(), buildItem({ id: 'item-2', title: 'Sponsor' })];

    facade.refresh().subscribe();

    const req = httpController.expectOne('/api/content');
    expect(req.request.method).toBe('GET');
    req.flush(items);

    expect(facade.items().length).toBe(2);
    expect(facade.loading()).toBeFalse();
    expect(facade.ready()).toBeTrue();
    expect(facade.error()).toBeNull();
  });

  it('refresh sets empty signal when no items are returned', () => {
    facade.refresh().subscribe();
    httpController.expectOne('/api/content').flush([]);
    expect(facade.empty()).toBeTrue();
    expect(facade.ready()).toBeFalse();
  });

  it('refresh maps backend envelope errors to safe ApplicationErrorContract', () => {
    const expected: ApplicationErrorContract = {
      code: 'validation_failed',
      message: 'Title is required.',
      category: 'validation'
    };
    facade.refresh().subscribe({
      error: () => undefined
    });
    httpController.expectOne('/api/content').flush(
      { code: 'validation_failed', message: 'Title is required.', category: 'validation' },
      { status: 422, statusText: 'Unprocessable Entity' }
    );
    const error = facade.error();
    expect(error).not.toBeNull();
    expect(error?.code).toBe(expected.code);
    expect(error?.category).toBe('validation');
  });

  it('load populates current signal', () => {
    const item = buildItem({ title: 'Welcome' });
    facade.load('item-1').subscribe();
    httpController.expectOne('/api/content/item-1').flush(item);
    expect(facade.current()?.title).toBe('Welcome');
  });

  it('save creates a new item and refreshes the list', () => {
    facade.save({ title: 'Agenda', contentType: 'photo', sourceReference: '', mediaFile: null, displayOrder: 1, isActive: true }).subscribe();
    const post = httpController.expectOne('/api/content');
    expect(post.request.method).toBe('POST');
    post.flush(buildItem());
    const list = httpController.expectOne('/api/content');
    list.flush([buildItem()]);
    expect(facade.items().length).toBe(1);
    expect(facade.saving()).toBeFalse();
  });

  it('save updates an existing item when id is provided', () => {
    facade.save({ title: 'Agenda', contentType: 'photo', sourceReference: '', mediaFile: null, displayOrder: 1, isActive: true }, 'item-1').subscribe();
    const put = httpController.expectOne('/api/content/item-1');
    expect(put.request.method).toBe('PUT');
    put.flush(buildItem());
    httpController.expectOne('/api/content').flush([buildItem()]);
  });

  it('upload posts multipart FormData to /api/content/upload', () => {
    const file = new File(['binary'], 'agenda.jpg', { type: 'image/jpeg' });
    facade.upload({ title: 'Agenda', contentType: 'photo', sourceReference: '', mediaFile: null, displayOrder: 1, isActive: true }, file).subscribe();
    const post = httpController.expectOne('/api/content/upload');
    expect(post.request.method).toBe('POST');
    expect(post.request.body instanceof FormData).toBeTrue();
    post.flush(buildItem());
    httpController.expectOne('/api/content').flush([buildItem()]);
  });

  it('upload replaces media via PUT /api/content/:id/upload when editing', () => {
    const file = new File(['binary'], 'agenda.jpg', { type: 'image/jpeg' });
    facade.upload(
      { title: 'Agenda', contentType: 'photo', sourceReference: '', mediaFile: null, displayOrder: 1, isActive: true },
      file,
      'item-1',
    ).subscribe();
    const put = httpController.expectOne('/api/content/item-1/upload');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body instanceof FormData).toBeTrue();
    put.flush(buildItem());
    httpController.expectOne('/api/content').flush([buildItem()]);
  });

  it('uploadMany uploads files sequentially and refreshes once', () => {
    const files = [
      new File(['one'], 'one.jpg', { type: 'image/jpeg' }),
      new File(['two'], 'two.jpg', { type: 'image/jpeg' })
    ];

    facade.uploadMany(
      (file) => ({ title: file.name, contentType: 'photo', sourceReference: '', mediaFile: null, isActive: true }),
      files
    ).subscribe();

    const first = httpController.expectOne('/api/content/upload');
    expect(first.request.method).toBe('POST');
    expect((first.request.body as FormData).get('title')).toBe('one.jpg');
    first.flush(buildItem({ id: 'item-1' }));

    const second = httpController.expectOne('/api/content/upload');
    expect((second.request.body as FormData).get('title')).toBe('two.jpg');
    second.flush(buildItem({ id: 'item-2' }));

    httpController.expectOne('/api/content').flush([buildItem(), buildItem({ id: 'item-2' })]);
    expect(facade.saving()).toBeFalse();
    expect(facade.items().length).toBe(2);
  });

  it('remove issues DELETE and refreshes the list', () => {
    facade.remove('item-1').subscribe();
    const del = httpController.expectOne('/api/content/item-1');
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
    httpController.expectOne('/api/content').flush([]);
    expect(facade.empty()).toBeTrue();
  });

  it('remove swallows errors and exposes them through error signal', () => {
    facade.remove('item-1').subscribe();
    httpController.expectOne('/api/content/item-1').flush(
      { code: 'conflict_state', message: 'Cannot delete referenced content.' },
      { status: 409, statusText: 'Conflict' }
    );
    const error = facade.error();
    expect(error?.category).toBe('conflict');
    expect(facade.saving()).toBeFalse();
  });

  it('removeMany issues a DELETE for each id and refreshes the list', () => {
    facade.removeMany(['item-1', 'item-2', 'item-3']).subscribe();
    const first = httpController.expectOne('/api/content/item-1');
    expect(first.request.method).toBe('DELETE');
    first.flush(null);
    const second = httpController.expectOne('/api/content/item-2');
    second.flush(null);
    const third = httpController.expectOne('/api/content/item-3');
    third.flush(null);
    httpController.expectOne('/api/content').flush([]);
    expect(facade.empty()).toBeTrue();
    expect(facade.saving()).toBeFalse();
  });

  it('removeMany short-circuits on an empty input', () => {
    let emitted = false;
    facade.removeMany([]).subscribe(() => (emitted = true));
    expect(emitted).toBeTrue();
    expect(facade.saving()).toBeFalse();
  });

  it('removeMany surfaces the first error and stops issuing deletes', () => {
    facade.removeMany(['item-1', 'item-2', 'item-3']).subscribe();
    httpController.expectOne('/api/content/item-1').flush(null);
    const failed = httpController.expectOne('/api/content/item-2');
    failed.flush(
      { code: 'conflict_state', message: 'Cannot delete referenced content.' },
      { status: 409, statusText: 'Conflict' }
    );
    // The third delete must NOT have been issued: concatMap aborts the
    // pipeline on the first error.
    httpController.expectNone('/api/content/item-3');
    expect(facade.error()?.category).toBe('conflict');
    expect(facade.saving()).toBeFalse();
  });

  it('clearError resets the error signal', () => {
    facade.refresh().subscribe({ error: () => undefined });
    httpController.expectOne('/api/content').flush(
      { code: 'unexpected_error', message: 'Boom' },
      { status: 500, statusText: 'Server Error' }
    );
    expect(facade.error()).not.toBeNull();
    facade.clearError();
    expect(facade.error()).toBeNull();
  });

  it('falls back to default error envelope when backend error shape is unknown', () => {
    const api = jasmine.createSpyObj<ContentApiService>('ContentApiService', ['list']);
    api.list.and.returnValue(throwError(() => 'totally unknown'));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ContentApiService, useValue: api },
        ContentFacade,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    const isolated = TestBed.inject(ContentFacade);
    isolated.refresh().subscribe({ error: () => undefined });
    const error = isolated.error();
    expect(error?.code).toBe('unexpected_error');
    expect(error?.category).toBe('unexpected');
  });
});
