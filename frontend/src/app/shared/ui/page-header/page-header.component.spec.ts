import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { PageHeaderComponent } from './page-header.component';

describe('PageHeaderComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PageHeaderComponent, NoopAnimationsModule],
      providers: [provideRouter([])]
    });
  });

  it('renders the eyebrow, title, and description', () => {
    const fixture = TestBed.createComponent(PageHeaderComponent);
    fixture.componentRef.setInput('eyebrow', 'Administration');
    fixture.componentRef.setInput('title', 'Top content');
    fixture.componentRef.setInput('description', 'Photos, videos, and iframes.');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Administration');
    expect(text).toContain('Top content');
    expect(text).toContain('Photos, videos, and iframes.');
  });
});
