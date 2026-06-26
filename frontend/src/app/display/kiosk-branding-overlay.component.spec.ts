import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KioskBrandingOverlayComponent, BrandingViewModel } from './kiosk-branding-overlay.component';

describe('KioskBrandingOverlayComponent', () => {
  let fixture: ComponentFixture<KioskBrandingOverlayComponent>;

  function setBranding(branding: BrandingViewModel, visible = true): void {
    fixture.componentRef.setInput('branding', branding);
    fixture.componentRef.setInput('visible', visible);
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [KioskBrandingOverlayComponent]
    });
    fixture = TestBed.createComponent(KioskBrandingOverlayComponent);
  });

  it('renders nothing when visible=false', () => {
    setBranding({ eventName: 'Show', organizerName: 'Org', organizerLogoUrl: null }, false);
    expect(fixture.nativeElement.querySelector('.branding-overlay')).toBeNull();
  });

  it('renders nothing when branding fields are all empty and visible=true', () => {
    setBranding({ eventName: '', organizerName: '', organizerLogoUrl: null });
    expect(fixture.nativeElement.querySelector('.branding-overlay')).toBeNull();
  });

  it('renders the event name pill when configured', () => {
    setBranding({ eventName: 'Spring Summit', organizerName: 'ACME', organizerLogoUrl: null });
    expect(fixture.nativeElement.querySelector('.branding-overlay')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Spring Summit');
  });

  it('renders the organizer logo when configured', () => {
    setBranding({
      eventName: '',
      organizerName: 'ACME',
      organizerLogoUrl: 'https://example.com/logo.png'
    });
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://example.com/logo.png');
  });

  it('hides the logo when its URL matches hiddenLogoUrl', () => {
    fixture.componentRef.setInput('branding', {
      eventName: '',
      organizerName: 'ACME',
      organizerLogoUrl: 'https://example.com/broken.png'
    });
    fixture.componentRef.setInput('hiddenLogoUrl', 'https://example.com/broken.png');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('emits logoBroken when the image fails to load', () => {
    const emitted: string[] = [];
    fixture.componentRef.setInput('branding', {
      eventName: '',
      organizerName: 'ACME',
      organizerLogoUrl: 'https://example.com/broken.png'
    });
    fixture.componentRef.setInput('hiddenLogoUrl', null);
    fixture.componentRef.instance.logoBroken.subscribe((url) => emitted.push(url));
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    img.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(emitted).toEqual(['https://example.com/broken.png']);
  });
});