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

  it('shows the loading progress bar when loading is true', () => {
    const fixture = TestBed.createComponent(DataListComponent);
    fixture.componentRef.setInput('title', 'X');
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-progress-bar')).toBeTruthy();
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

  it('renders the refresh and primary action buttons when not on handset', () => {
    const fixture = TestBed.createComponent(DataListComponent);
    fixture.componentRef.setInput('title', 'X');
    fixture.componentRef.setInput('refreshAction', { route: '/admin/content' });
    fixture.componentRef.setInput('primaryAction', { label: 'Add content', route: '/admin/content/new' });
    fixture.detectChanges();

    const links = Array.from(fixture.nativeElement.querySelectorAll('a[href]')) as HTMLAnchorElement[];
    const routes = links.map((link) => link.getAttribute('href'));
    expect(routes).toContain('/admin/content');
    expect(routes).toContain('/admin/content/new');
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
