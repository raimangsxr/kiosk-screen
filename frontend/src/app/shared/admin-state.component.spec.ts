import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AdminStateComponent } from './admin-state.component';

describe('AdminStateComponent', () => {
  it('renders status content and action', () => {
    TestBed.configureTestingModule({ imports: [AdminStateComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminStateComponent);
    fixture.componentInstance.title = 'No records';
    fixture.componentInstance.message = 'Add the first record.';
    fixture.componentInstance.actionLabel = 'Add';
    fixture.componentInstance.actionRoute = '/admin/content/new';
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No records');
    expect(fixture.nativeElement.textContent).toContain('Add');
  });
});
