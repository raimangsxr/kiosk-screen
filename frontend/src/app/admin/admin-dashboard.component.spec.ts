import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AdminDashboardComponent } from './admin-dashboard.component';
import { AdminDashboardService } from './admin-dashboard.service';

describe('AdminDashboardComponent', () => {
  it('renders setup status, section summaries, and quick actions', () => {
    TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        provideRouter([]),
        {
          provide: AdminDashboardService,
          useValue: {
            load: () => of({
              setupStatus: 'warning',
              blockers: [],
              warnings: ['Review display configuration'],
              sectionSummaries: [
                { label: 'Content', value: '3 items', route: '/admin/content', status: 'ready' },
                { label: 'Users', value: '1 users', route: '/admin/users', status: 'ready' }
              ],
              quickActions: [
                { label: 'Add content', route: '/admin/content/new', description: 'Create display content' }
              ]
            })
          }
        }
      ]
    });

    const fixture = TestBed.createComponent(AdminDashboardComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('warning');
    expect(fixture.nativeElement.textContent).toContain('3 items');
    expect(fixture.nativeElement.textContent).toContain('Add content');
  });
});
