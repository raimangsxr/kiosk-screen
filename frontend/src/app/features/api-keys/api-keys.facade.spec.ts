import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { ApiKeysApiService } from '../../core/api/api-keys.api';
import { ApiKeysFacade } from './api-keys.facade';
import {
  ApiKeyRecord,
  ApiKeyWithRawSecret,
  ApplicationErrorContract,
} from '../../shared/contracts/admin-contracts';

const baseRecord: ApiKeyRecord = {
  id: 'k1',
  label: 'test',
  keyPrefix: 'ksk_live_AbCdEfGh',
  isActive: true,
  createdAt: '2026-06-18T00:00:00Z',
  lastRotatedAt: null,
  lastUsedAt: null,
  revokedAt: null,
  createdByUserId: 'u1',
};

describe('ApiKeysFacade', () => {
  let facade: ApiKeysFacade;
  let api: jasmine.SpyObj<ApiKeysApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiKeysApiService>('ApiKeysApiService', [
      'list',
      'create',
      'rotate',
      'revoke',
      'delete',
    ]);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiKeysApiService, useValue: api },
        ApiKeysFacade,
      ],
    });
    facade = TestBed.inject(ApiKeysFacade);
  });

  it('refresh() populates keys and clears error', (done) => {
    api.list.and.returnValue(of([baseRecord]));
    facade.refresh().subscribe(() => {
      expect(facade.keys()).toEqual([baseRecord]);
      expect(facade.loading()).toBeFalse();
      expect(facade.error()).toBeNull();
      done();
    });
  });

  it('refresh() captures an error envelope on failure', (done) => {
    api.list.and.returnValue(throwError(() => ({ status: 500, error: { code: 'unexpected' } })));
    facade.refresh().subscribe({
      next: () => done.fail('expected error'),
      error: () => {
        const err = facade.error() as ApplicationErrorContract | null;
        expect(err).not.toBeNull();
        expect(err!.code).toBe('unexpected');
        expect(facade.loading()).toBeFalse();
        done();
      },
    });
  });

  it('create() returns the with-raw payload and refreshes', (done) => {
    const created: ApiKeyWithRawSecret = {
      record: baseRecord,
      rawKey: 'ksk_live_AbCdEfGh_secret',
    };
    api.create.and.returnValue(of(created));
    api.list.and.returnValue(of([baseRecord]));
    facade.create('test').subscribe((result) => {
      expect(result).toEqual(created);
      expect(facade.keys().length).toBe(1);
      expect(facade.saving()).toBeFalse();
      done();
    });
  });

  it('rotate() returns the new with-raw payload and refreshes', (done) => {
    const rotated: ApiKeyWithRawSecret = {
      record: { ...baseRecord, lastRotatedAt: '2026-06-18T01:00:00Z' },
      rawKey: 'ksk_live_IjKlMnOp_secret',
    };
    api.rotate.and.returnValue(of(rotated));
    api.list.and.returnValue(of([rotated.record]));
    facade.rotate('k1').subscribe((result) => {
      expect(result).toEqual(rotated);
      expect(facade.keys()[0].lastRotatedAt).toBe('2026-06-18T01:00:00Z');
      done();
    });
  });

  it('revoke() refreshes the list', (done) => {
    api.revoke.and.returnValue(of(undefined));
    api.list.and.returnValue(of([{ ...baseRecord, isActive: false, revokedAt: '2026-06-18T02:00:00Z' }]));
    facade.revoke('k1').subscribe(() => {
      expect(facade.keys()[0].isActive).toBeFalse();
      expect(facade.saving()).toBeFalse();
      done();
    });
  });

  it('delete() refreshes the list and clears saving', (done) => {
    api.delete.and.returnValue(of(undefined));
    api.list.and.returnValue(of([]));
    facade.delete('k1').subscribe(() => {
      expect(api.delete).toHaveBeenCalledWith('k1');
      expect(facade.keys().length).toBe(0);
      expect(facade.saving()).toBeFalse();
      done();
    });
  });

  it('delete() maps an error envelope to facade.error', (done) => {
    api.delete.and.returnValue(throwError(() => ({ status: 409, error: { code: 'api_key_not_revoked' } })));
    facade.delete('k1').subscribe({
      next: () => done.fail('expected error'),
      error: () => {
        const err = facade.error() as ApplicationErrorContract | null;
        expect(err).not.toBeNull();
        expect(err!.code).toBe('api_key_not_revoked');
        expect(facade.saving()).toBeFalse();
        done();
      },
    });
  });

  it('empty() is true when the list is empty and not loading', (done) => {
    api.list.and.returnValue(of([]));
    facade.refresh().subscribe(() => {
      expect(facade.empty()).toBeTrue();
      expect(facade.ready()).toBeFalse();
      done();
    });
  });

  it('ready() is true when the list has entries', (done) => {
    api.list.and.returnValue(of([baseRecord]));
    facade.refresh().subscribe(() => {
      expect(facade.ready()).toBeTrue();
      expect(facade.empty()).toBeFalse();
      done();
    });
  });

  it('clearError() resets the error signal', (done) => {
    api.list.and.returnValue(throwError(() => ({ status: 500, error: { code: 'unexpected' } })));
    facade.refresh().subscribe({
      error: () => {
        expect(facade.error()).not.toBeNull();
        facade.clearError();
        expect(facade.error()).toBeNull();
        done();
      },
    });
  });
});
