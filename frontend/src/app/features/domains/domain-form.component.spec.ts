import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AdminApiService, ApprovedDomain } from '../../admin/admin-api.service';
import { DomainsFacade } from './domains.facade';
import { DomainListComponent } from './domain-list.component';
import { DomainFormComponent } from './domain-form.component';

function buildDomain(partial: Partial<ApprovedDomain> = {}): ApprovedDomain {
  return { id: 'domain-1', domain: 'example.com', isActive: true, ...partial };
}

function stubRoute(id: string | null) {
  const params = id ? { id } : {};
  return {
    snapshot: { paramMap: convertToParamMap(params) },
    paramMap: of(convertToParamMap(params))
  };
}

describe('DomainListComponent (Material)', () => {
  let fixture: ComponentFixture<DomainListComponent>;
  let httpController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DomainListComponent, NoopAnimationsModule],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    httpController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DomainListComponent);
    fixture.detectChanges();
    httpController.expectOne('/api/approved-domains').flush([buildDomain()]);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpController.verify();
  });

  it('renders domain and active status', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('example.com');
    expect(text).toContain('Active');
  });

  it('shows empty state when no domains are returned', () => {
    fixture.componentInstance['facade'].refresh().subscribe();
    httpController.expectOne('/api/approved-domains').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No approved domains yet');
  });

  it('exposes a redacted error message when list fails', () => {
    fixture.componentInstance['facade'].refresh().subscribe({ error: () => undefined });
    httpController
      .expectOne('/api/approved-domains')
      .flush(
        { code: 'unexpected_error', message: 'Failure at /var/log/domain.log', category: 'unexpected' },
        { status: 500, statusText: 'Server Error' }
      );
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Approved domains unavailable');
    expect(text).not.toContain('/var/log/');
  });
});

describe('DomainFormComponent (Reactive Forms + Material)', () => {
  let httpController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DomainFormComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: stubRoute(null) }
      ]
    }).compileComponents();
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  function newForm(): ComponentFixture<DomainFormComponent> {
    return TestBed.createComponent(DomainFormComponent);
  }

  it('marks domain as required and prevents save when invalid', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    const form = fixture.componentInstance['form']!;
    expect(form.controls.domain.hasError('required')).toBeTrue();
    fixture.componentInstance.submit();
    httpController.expectNone('/api/approved-domains');
  });

  it('submits a new domain with create endpoint and lowercases the value', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    const form = fixture.componentInstance['form']!;
    form.controls.domain.setValue('Example.COM');
    fixture.componentInstance.submit();
    const post = httpController.expectOne('/api/approved-domains');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ domain: 'example.com', isActive: true });
    post.flush(buildDomain());
    httpController.expectOne('/api/approved-domains').flush([]);
  });

  it('tracks unsaved changes after a field is edited', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
    const form = fixture.componentInstance['form']!;
    form.controls.domain.setValue('new.example.com');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
  });
});
