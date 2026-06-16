import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';

import { AdFormComponent } from './ad-form.component';
import { AdsApiService } from './ads-api.service';

describe('AdFormComponent', () => {
  it('submits ad workflow fields', () => {
    const api = jasmine.createSpyObj<AdsApiService>('AdsApiService', ['createAd']);
    api.createAd.and.returnValue(of({ id: '1', clientId: 'client-1', label: 'Ad', sourceReference: 'x', isActive: true, displayOrder: 1 }));
    TestBed.configureTestingModule({ imports: [AdFormComponent], providers: [{ provide: AdsApiService, useValue: api }] });
    const fixture = TestBed.createComponent(AdFormComponent);
    fixture.componentInstance.clientId = 'client-1';
    fixture.componentInstance.label = 'Ad';
    fixture.componentInstance.sourceReference = 'https://example.com/ad.jpg';

    fixture.componentInstance.submit();

    expect(api.createAd).toHaveBeenCalled();
    expect(fixture.componentInstance.saved).toBeTrue();
  });
});
