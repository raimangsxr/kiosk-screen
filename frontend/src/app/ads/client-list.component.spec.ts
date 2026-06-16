import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';

import { AdsApiService } from './ads-api.service';
import { ClientListComponent } from './client-list.component';

describe('ClientListComponent', () => {
  it('renders client status clearly', () => {
    TestBed.configureTestingModule({
      imports: [ClientListComponent],
      providers: [{ provide: AdsApiService, useValue: { listClients: () => of([{ id: '1', name: 'Sponsor', isActive: true }]) } }]
    });
    const fixture = TestBed.createComponent(ClientListComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sponsor');
    expect(fixture.nativeElement.textContent).toContain('Active');
  });
});
