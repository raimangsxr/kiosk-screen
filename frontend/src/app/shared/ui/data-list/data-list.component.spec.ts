import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { BreakpointService } from '../../../core/layout/breakpoint.service';
import { DataListComponent } from './data-list.component';

@Component({
  selector: 'app-test-table',
  standalone: true,
  template: '<ng-template #dataListTable>TABLE-CONTENT</ng-template><ng-template #dataListCards>CARDS-CONTENT</ng-template>'
})
class TestHostComponent {}

describe('DataListComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DataListComponent, NoopAnimationsModule, TestHostComponent],
      providers: [provideRouter([])]
    });
  });

  it('renders the title and description', () => {
    const fixture = TestBed.createComponent(DataListComponent);
    fixture.componentRef.setInput('title', 'Top content');
    fixture.componentRef.setInput('description', 'Photos, videos, iframes.');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Top content');
    expect(text).toContain('Photos, videos, iframes.');
  });

  it('shows the skeleton placeholders when loading is true and no items have loaded yet', () => {
    const fixture = TestBed.createComponent(DataListComponent);
    fixture.componentRef.setInput('title', 'X');
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const skeleton = fixture.nativeElement.querySelector('[data-testid="data-list-skeleton"]');
    expect(skeleton).toBeTruthy();
    expect(skeleton.querySelectorAll('.data-list__skeleton-row').length).toBe(4);
  });

  it('keeps the skeleton visible while loading is true', () => {
    const fixture = TestBed.createComponent(DataListComponent);
    fixture.componentRef.setInput('title', 'X');
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="data-list-skeleton"]')).toBeTruthy();

    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="data-list-skeleton"]')).toBeNull();
  });

  it('shows the empty state when empty is true and no error', () => {
    const fixture = TestBed.createComponent(DataListComponent);
    fixture.componentRef.setInput('title', 'X');
    fixture.componentRef.setInput('empty', true);
    fixture.componentRef.setInput('emptyTitle', 'No content yet');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No content yet');
  });

  it('shows the error state when error is set', () => {
    const fixture = TestBed.createComponent(DataListComponent);
    fixture.componentRef.setInput('title', 'X');
    fixture.componentRef.setInput('errorTitle', 'Could not load content');
    fixture.componentRef.setInput('error', { message: 'Network down' });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Could not load content');
    expect(text).toContain('Network down');
  });

  it('renders the refresh button and primary action link when not on handset', () => {
    const fixture = TestBed.createComponent(DataListComponent);
    fixture.componentRef.setInput('title', 'X');
    fixture.componentRef.setInput('refreshAction', { label: 'Refresh' });
    fixture.componentRef.setInput('primaryAction', { label: 'Add content', route: '/admin/content/new' });
    fixture.detectChanges();

    const refreshButton = fixture.nativeElement.querySelector(
      '[data-testid="data-list-refresh"]'
    ) as HTMLButtonElement | null;
    expect(refreshButton).toBeTruthy();
    expect(refreshButton?.textContent).toContain('Refresh');

    const links = Array.from(fixture.nativeElement.querySelectorAll('a[href]')) as HTMLAnchorElement[];
    const routes = links.map((link) => link.getAttribute('href'));
    expect(routes).toContain('/admin/content/new');
  });

  it('emits (refresh) when the refresh button is clicked and a listener is bound', () => {
    const fixture = TestBed.createComponent(DataListComponent);
    fixture.componentRef.setInput('title', 'X');
    fixture.componentRef.setInput('refreshAction', { label: 'Refresh' });
    fixture.detectChanges();

    const emitted: number[] = [];
    fixture.componentRef.instance.refresh.subscribe(() => emitted.push(1));

    const button = fixture.nativeElement.querySelector(
      '[data-testid="data-list-refresh"]'
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(emitted.length).toBe(1);
  });

  it('does not render the refresh button when refreshAction is null', () => {
    const fixture = TestBed.createComponent(DataListComponent);
    fixture.componentRef.setInput('title', 'X');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '[data-testid="data-list-refresh"]'
    );
    expect(button).toBeNull();
  });

  it('emits (emptyAction) when the empty-state action button is clicked', () => {
    const fixture = TestBed.createComponent(DataListComponent);
    fixture.componentRef.setInput('title', 'X');
    fixture.componentRef.setInput('empty', true);
    fixture.componentRef.setInput('emptyTitle', 'Nothing here');
    fixture.componentRef.setInput('emptyActionLabel', 'Add');
    // No `emptyActionRoute` — the empty state renders an emit-only <button>
    // so the host can run its own handler (open dialog, refetch, etc.).
    fixture.detectChanges();

    const emitted: number[] = [];
    fixture.componentRef.instance.emptyAction.subscribe(() => emitted.push(1));

    const button = fixture.nativeElement.querySelector(
      '[data-testid="empty-state-action"]'
    ) as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();
    fixture.detectChanges();

    expect(emitted.length).toBe(1);
  });

  it('hides the primary action button in the header when on handset (replaced by FAB)', () => {
    const fixture = TestBed.createComponent(DataListComponent);
    fixture.componentRef.setInput('title', 'X');
    fixture.componentRef.setInput('primaryAction', { label: 'Add content', route: '/admin/content/new' });
    const breakpoint = TestBed.inject(BreakpointService);
    spyOn(breakpoint, 'isHandset').and.returnValue(true);
    fixture.detectChanges();

    const links = Array.from(fixture.nativeElement.querySelectorAll('a[href]')) as HTMLAnchorElement[];
    const routes = links.map((link) => link.getAttribute('href'));
    expect(routes).toContain('/admin/content/new');
  });
});