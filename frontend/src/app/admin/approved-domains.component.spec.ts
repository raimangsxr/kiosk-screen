import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminApiService } from './admin-api.service';
import { ApprovedDomainsComponent } from './approved-domains.component';

describe('ApprovedDomainsComponent', () => {
  it('lists domains and toggles active status', () => {
    const api = jasmine.createSpyObj<AdminApiService>('AdminApiService', ['listDomains', 'createDomain', 'updateDomain', 'deleteDomain']);
    api.listDomains.and.returnValue(of([{ id: 'domain-1', domain: 'example.com', isActive: true }]));
    api.updateDomain.and.returnValue(of({ id: 'domain-1', domain: 'example.com', isActive: false }));

    TestBed.configureTestingModule({
      imports: [ApprovedDomainsComponent],
      providers: [{ provide: AdminApiService, useValue: api }]
    });
    const fixture = TestBed.createComponent(ApprovedDomainsComponent);
    fixture.detectChanges();

    fixture.componentInstance.toggle({ id: 'domain-1', domain: 'example.com', isActive: true });

    expect(fixture.nativeElement.textContent).toContain('example.com');
    expect(api.updateDomain).toHaveBeenCalledWith('domain-1', { domain: 'example.com', isActive: false });
  });
});
