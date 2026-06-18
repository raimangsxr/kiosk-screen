import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { SectionActionsComponent } from './section-actions.component';

describe('SectionActionsComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SectionActionsComponent, NoopAnimationsModule],
      providers: [provideRouter([])]
    });
  });

  it('renders a primary action as a flat button', () => {
    const fixture = TestBed.createComponent(SectionActionsComponent);
    fixture.componentRef.setInput('actions', [
      { label: 'Add content', route: '/admin/content/new', kind: 'primary', icon: 'add' }
    ]);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a[href="/admin/content/new"]');
    expect(link).toBeTruthy();
    expect(link.classList).toContain('mdc-button');
    expect(link.textContent).toContain('Add content');
  });

  it('renders a secondary action as a stroked button', () => {
    const fixture = TestBed.createComponent(SectionActionsComponent);
    fixture.componentRef.setInput('actions', [
      { label: 'Refresh', route: '/admin/content', kind: 'secondary' }
    ]);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a[href="/admin/content"]');
    expect(link).toBeTruthy();
    expect(link.classList).toContain('mdc-button--outlined');
  });

  it('renders nothing when no actions are provided', () => {
    const fixture = TestBed.createComponent(SectionActionsComponent);
    fixture.componentRef.setInput('actions', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('a').length).toBe(0);
  });
});
