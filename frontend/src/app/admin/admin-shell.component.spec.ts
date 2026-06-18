import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AdminShellComponent } from './admin-shell.component';

describe('AdminShellComponent', () => {
  it('renders accessible admin navigation', () => {
    TestBed.configureTestingModule({ imports: [AdminShellComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Iframe domains');
    expect(fixture.nativeElement.textContent).toContain('Content');
    expect(fixture.nativeElement.textContent).toContain('Users and roles');
    expect(fixture.nativeElement.textContent).toContain('Enter kiosk mode');
    expect(fixture.nativeElement.querySelector('nav')?.getAttribute('aria-label')).toBe('Admin sections');
  });
});
