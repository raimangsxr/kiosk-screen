import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HallComponent } from './hall.component';

describe('HallComponent', () => {
  it('offers kiosk and administration destinations', () => {
    TestBed.configureTestingModule({
      imports: [HallComponent],
      providers: [provideRouter([])]
    });

    const fixture = TestBed.createComponent(HallComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    const links = Array.from(fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>)
      .map((link) => link.getAttribute('href'));

    expect(text).toContain('Enter kiosk mode');
    expect(text).toContain('Open administration panel');
    expect(links).toContain('/display');
    expect(links).toContain('/admin');
  });
});
