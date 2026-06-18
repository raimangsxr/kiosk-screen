import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EmptyStateComponent, NoopAnimationsModule],
      providers: [provideRouter([])]
    });
  });

  it('renders the title and icon', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('title', 'No content yet');
    fixture.componentRef.setInput('icon', 'photo_library');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('No content yet');
    const icon = fixture.nativeElement.querySelector('mat-icon');
    expect(icon.textContent.trim()).toBe('photo_library');
  });

  it('renders an action button when route and label are provided', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('title', 'No content yet');
    fixture.componentRef.setInput('actionLabel', 'Add content');
    fixture.componentRef.setInput('actionRoute', '/admin/content/new');
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a[href]');
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/admin/content/new');
    expect(link.textContent).toContain('Add content');
  });

  it('hides the action button when label is empty', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('title', 'Nothing here');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a[href]')).toBeNull();
  });
});
