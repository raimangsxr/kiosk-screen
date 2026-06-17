import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AdsApiService } from './ads-api.service';
import { ClientFormComponent } from './client-form.component';

describe('ClientFormComponent', () => {
  it('creates clients and marks the form as saved', () => {
    const api = jasmine.createSpyObj<AdsApiService>('AdsApiService', ['listClients', 'createClient', 'updateClient']);
    api.createClient.and.returnValue(of({ id: 'client-1', name: 'Sponsor', isActive: true }));

    TestBed.configureTestingModule({
      imports: [ClientFormComponent],
      providers: [{ provide: AdsApiService, useValue: api }, provideRouter([])]
    });
    const fixture = TestBed.createComponent(ClientFormComponent);
    fixture.detectChanges();

    fixture.componentInstance.name = 'Sponsor';
    fixture.componentInstance.submit();

    expect(api.createClient).toHaveBeenCalledWith({ name: 'Sponsor', isActive: true });
    expect(fixture.componentInstance.saved).toBeTrue();
  });
});
