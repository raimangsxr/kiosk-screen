import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';
import { BreakpointState } from '@angular/cdk/layout';

import { PageHeaderComponent } from './page-header.component';

class BreakpointObserverStub {
  readonly events = new BehaviorSubject<BreakpointState>({
    matches: false,
    breakpoints: {}
  });

  observe() {
    return this.events.asObservable();
  }

  isMatched(_query: string | string[]): boolean {
    return false;
  }
}

describe('PageHeaderComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PageHeaderComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: BreakpointObserver, useValue: new BreakpointObserverStub() }
      ]
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
