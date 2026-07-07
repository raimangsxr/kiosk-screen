import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { HallComponent } from './hall.component';

describe('HallComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HallComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('uses the shared header and offers kiosk and administration destinations', () => {
    const fixture = TestBed.createComponent(HallComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    const links = Array.from(fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>)
      .map((link) => link.getAttribute('href'));

    expect(text).toContain('Enter kiosk mode');
    expect(text).toContain('Open administration');
    expect(text).not.toContain('Open remote control');
    expect(fixture.nativeElement.querySelector('app-admin-toolbar')).not.toBeNull();
    expect(links).toContain('/display');
    expect(links).toContain('/admin');
    expect(links).not.toContain('/remote-control');
    expect(text).toContain('Versión dev');
  });
});
