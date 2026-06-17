import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ReadinessApiService } from './readiness-api.service';
import { ReadinessComponent } from './readiness.component';

describe('ReadinessComponent', () => {
  it('shows clear readiness diagnostics', () => {
    TestBed.configureTestingModule({
      imports: [ReadinessComponent],
      providers: [{ provide: ReadinessApiService, useValue: { getReadiness: () => of({ ready: false, blockers: ['Missing ad'], warnings: [] }) } }, provideRouter([])]
    });
    const fixture = TestBed.createComponent(ReadinessComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Blocked');
    expect(fixture.nativeElement.textContent).toContain('Missing ad');
  });
});
