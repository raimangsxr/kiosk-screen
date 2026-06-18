import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { AdminStateComponent } from './admin-state.component';

describe('AdminStateComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminStateComponent, NoopAnimationsModule],
      providers: [provideRouter([])]
    });
  });

  it('renders the title and message', () => {
    const fixture = TestBed.createComponent(AdminStateComponent);
    fixture.componentRef.setInput('title', 'No content yet');
    fixture.componentRef.setInput('message', 'Add a photo or video.');
    fixture.componentRef.setInput('kind', 'empty');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('No content yet');
    expect(text).toContain('Add a photo or video.');
  });

  it('renders an action link when action route and label are provided', () => {
    const fixture = TestBed.createComponent(AdminStateComponent);
    fixture.componentRef.setInput('title', 'No content yet');
    fixture.componentRef.setInput('actionLabel', 'Add content');
    fixture.componentRef.setInput('actionRoute', '/admin/content/new');
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a[href]');
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/admin/content/new');
    expect(link.textContent).toContain('Add content');
  });

  it('marks the section as an alert when kind is error', () => {
    const fixture = TestBed.createComponent(AdminStateComponent);
    fixture.componentRef.setInput('title', 'Something went wrong');
    fixture.componentRef.setInput('kind', 'error');
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('mat-card');
    expect(card.getAttribute('role')).toBe('alert');
  });
});
