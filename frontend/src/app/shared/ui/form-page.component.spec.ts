import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { FormPageComponent } from './form-page.component';

describe('FormPageComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FormPageComponent, NoopAnimationsModule],
      providers: [provideRouter([])]
    });
  });

  it('renders the title and subtitle when provided', () => {
    const fixture = TestBed.createComponent(FormPageComponent);
    fixture.componentRef.setInput('title', 'Edit content item');
    fixture.componentRef.setInput('subtitle', 'Update ordering and rotation.');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Edit content item');
    expect(text).toContain('Update ordering and rotation.');
  });

  it('shows the loading indicator when loading is true', () => {
    const fixture = TestBed.createComponent(FormPageComponent);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-progress-bar')).toBeTruthy();
  });
});
