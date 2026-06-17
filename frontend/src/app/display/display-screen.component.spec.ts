import { of } from 'rxjs';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { DisplayApiService, DisplayState } from './display-api.service';
import { DisplayScreenComponent } from './display-screen.component';

describe('DisplayScreenComponent', () => {
  const readyState: DisplayState = {
    configuration: {
      id: 'config-1',
      name: 'Main',
      topRegionRatio: 4,
      bottomRegionRatio: 1,
      defaultTopDurationSeconds: 15,
      defaultAdDurationSeconds: 10,
      configuredEventDurationMinutes: 120,
      isEnabled: true
    },
    topContent: [{
      id: 'content-1',
      title: 'Welcome',
      contentType: 'photo',
      sourceReference: 'https://example.com/welcome.jpg',
      isActive: true,
      displayOrder: 1,
      durationSeconds: 15
    }],
    ads: [{
      id: 'ad-1',
      clientId: 'client-1',
      label: 'Sponsor',
      sourceReference: 'https://example.com/ad.jpg',
      isActive: true,
      displayOrder: 1,
      durationSeconds: 10
    }],
    fallbackActive: false
  };

  function createComponent(state: DisplayState): ComponentFixture<DisplayScreenComponent> {
    TestBed.configureTestingModule({
      imports: [DisplayScreenComponent],
      providers: [{
        provide: DisplayApiService,
        useValue: { openDisplay: () => of(state) }
      }]
    });
    const fixture = TestBed.createComponent(DisplayScreenComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders a stable 4-to-1 kiosk shell without management controls', () => {
    const fixture = createComponent(readyState);
    const host: HTMLElement = fixture.nativeElement;
    const screen = host.querySelector('.display-screen');
    const topRegion = host.querySelector('.top-region') as HTMLElement;
    const adRegion = host.querySelector('.ad-region') as HTMLElement;

    expect(screen).not.toBeNull();
    expect(topRegion.offsetHeight / adRegion.offsetHeight).toBeCloseTo(4, 0);
    expect(host.textContent).not.toContain('Admin');
    expect(host.textContent).not.toContain('Settings');
  });

  it('renders fallback states when content and ads are unavailable', () => {
    const fixture = createComponent({ ...readyState, topContent: [], ads: [], fallbackActive: true });
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Content unavailable');
    expect(text).toContain('Ads unavailable');
  });

  it('rotates top content using effective duration', fakeAsync(() => {
    const fixture = createComponent({
      ...readyState,
      topContent: [
        { ...readyState.topContent[0], title: 'First', durationSeconds: 1 },
        { ...readyState.topContent[0], id: 'content-2', title: 'Second', displayOrder: 2, durationSeconds: 1 }
      ]
    });

    expect(fixture.componentInstance.currentContent?.title).toBe('First');

    tick(1000);
    fixture.detectChanges();

    expect(fixture.componentInstance.currentContent?.title).toBe('Second');
  }));
});
