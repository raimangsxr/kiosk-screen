import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KioskBrandingOverlayComponent, BrandingViewModel } from './kiosk-branding-overlay.component';

describe('KioskBrandingOverlayComponent', () => {
  let fixture: ComponentFixture<KioskBrandingOverlayComponent>;

  function setBranding(branding: BrandingViewModel, visible = true): void {
    fixture.componentRef.setInput('branding', branding);
    fixture.componentRef.setInput('visible', visible);
    fixture.detectChanges();
  }

  function emptyBranding(): BrandingViewModel {
    return {
      eventName: '',
      organizerName: '',
      organizerLogoUrl: null,
      logoLayout: null,
      eventNameLayout: null
    };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [KioskBrandingOverlayComponent]
    });
    fixture = TestBed.createComponent(KioskBrandingOverlayComponent);
  });

  it('renders nothing when visible=false', () => {
    setBranding({ ...emptyBranding(), eventName: 'Show', organizerName: 'Org' }, false);
    expect(fixture.nativeElement.querySelector('.branding-overlay')).toBeNull();
  });

  it('renders nothing when branding fields are all empty and visible=true', () => {
    setBranding(emptyBranding());
    expect(fixture.nativeElement.querySelector('.branding-overlay')).toBeNull();
  });

  it('renders the event name pill when configured', () => {
    setBranding({ ...emptyBranding(), eventName: 'Spring Summit', organizerName: 'ACME' });
    expect(fixture.nativeElement.querySelector('.branding-overlay')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Spring Summit');
  });

  it('renders the organizer logo when configured', () => {
    setBranding({
      ...emptyBranding(),
      organizerName: 'ACME',
      organizerLogoUrl: 'https://example.com/logo.png'
    });
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://example.com/logo.png');
  });

  it('hides the logo when its URL matches hiddenLogoUrl', () => {
    fixture.componentRef.setInput('branding', {
      ...emptyBranding(),
      organizerName: 'ACME',
      organizerLogoUrl: 'https://example.com/broken.png'
    });
    fixture.componentRef.setInput('hiddenLogoUrl', 'https://example.com/broken.png');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('shows a new logo URL after hiddenLogoUrl matched a previous broken URL', () => {
    fixture.componentRef.setInput('branding', {
      ...emptyBranding(),
      organizerName: 'ACME',
      organizerLogoUrl: 'https://example.com/broken.png'
    });
    fixture.componentRef.setInput('hiddenLogoUrl', 'https://example.com/broken.png');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();

    fixture.componentRef.setInput('branding', {
      ...emptyBranding(),
      organizerName: 'ACME',
      organizerLogoUrl: 'https://example.com/fixed.png'
    });
    fixture.componentRef.setInput('hiddenLogoUrl', null);
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://example.com/fixed.png');
  });

  it('emits logoBroken when the image fails to load', () => {
    const emitted: string[] = [];
    fixture.componentRef.setInput('branding', {
      ...emptyBranding(),
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

  describe('CHG-023: data-driven layout via CSS custom properties', () => {
    it('binds the logo layout as CSS custom properties on the overlay container', () => {
      setBranding({
        ...emptyBranding(),
        eventName: 'Spring Summit',
        organizerName: 'ACME',
        logoLayout: { size: 12, x: 5, y: 2, transparency: 80, borderRadius: 4 }
      });

      const overlay = fixture.nativeElement.querySelector('.branding-overlay') as HTMLElement;
      expect(overlay.style.getPropertyValue('--logo-size')).toBe('12');
      expect(overlay.style.getPropertyValue('--logo-x')).toBe('5');
      expect(overlay.style.getPropertyValue('--logo-y')).toBe('2');
      expect(overlay.style.getPropertyValue('--logo-transparency')).toBe('80');
      expect(overlay.style.getPropertyValue('--logo-border-radius')).toBe('4');
    });

    it('binds the event-name layout as CSS custom properties on the overlay container', () => {
      setBranding({
        ...emptyBranding(),
        eventName: 'Spring Summit',
        organizerName: 'ACME',
        eventNameLayout: { size: 2.5, x: 60, y: 1, transparency: 90, borderRadius: 8 }
      });

      const overlay = fixture.nativeElement.querySelector('.branding-overlay') as HTMLElement;
      expect(overlay.style.getPropertyValue('--event-name-size')).toBe('2.5');
      expect(overlay.style.getPropertyValue('--event-name-x')).toBe('60');
      expect(overlay.style.getPropertyValue('--event-name-y')).toBe('1');
      expect(overlay.style.getPropertyValue('--event-name-transparency')).toBe('90');
      expect(overlay.style.getPropertyValue('--event-name-border-radius')).toBe('8');
    });

    it('does not bind CSS custom properties when the layout is null (var() fallback applies)', () => {
      setBranding({
        ...emptyBranding(),
        eventName: 'Spring Summit',
        organizerName: 'ACME'
      });

      const overlay = fixture.nativeElement.querySelector('.branding-overlay') as HTMLElement;
      expect(overlay.style.getPropertyValue('--logo-size')).toBe('');
      expect(overlay.style.getPropertyValue('--event-name-x')).toBe('');
    });

    it('skips individual layout fields that are absent (e.g. only size set)', () => {
      setBranding({
        ...emptyBranding(),
        eventName: 'Spring Summit',
        organizerName: 'ACME',
        logoLayout: { size: 10 }
      });

      const overlay = fixture.nativeElement.querySelector('.branding-overlay') as HTMLElement;
      expect(overlay.style.getPropertyValue('--logo-size')).toBe('10');
      expect(overlay.style.getPropertyValue('--logo-x')).toBe('');
      expect(overlay.style.getPropertyValue('--logo-y')).toBe('');
      expect(overlay.style.getPropertyValue('--logo-transparency')).toBe('');
      expect(overlay.style.getPropertyValue('--logo-border-radius')).toBe('');
    });
  });

  describe('CHG-023: default-look preservation (US5 / SC-003)', () => {
    function computedTop(element: HTMLElement, property: string): string {
      return globalThis.getComputedStyle(element).getPropertyValue(property).trim();
    }

    it('renders the logo with clamp(36px, 6vh, 80px) height when layout is null', () => {
      setBranding({
        ...emptyBranding(),
        eventName: '',
        organizerName: 'ACME',
        organizerLogoUrl: 'https://example.com/logo.png'
      });

      const logo = fixture.nativeElement.querySelector('.branding-overlay__logo') as HTMLElement;
      const height = computedTop(logo, 'height');
      expect(height).not.toBe('');
      expect(logo.style.top).toBe('');
      expect(logo.style.left).toBe('');
      expect(logo.style.opacity).toBe('');
      expect(logo.style.borderRadius).toBe('');
    });

    it('renders the event-name pill right-anchored and unbounded (always single line) when layout is null', () => {
      setBranding({
        ...emptyBranding(),
        eventName: 'Spring Summit',
        organizerName: 'ACME'
      });

      const pill = fixture.nativeElement.querySelector('.branding-overlay__event-name') as HTMLElement;
      const fontSize = computedTop(pill, 'font-size');
      const rightOffset = computedTop(pill, 'right');
      const whiteSpace = computedTop(pill, 'white-space');
      const maxWidth = computedTop(pill, 'max-width');
      expect(fontSize).not.toBe('');
      expect(rightOffset).not.toBe('auto');
      expect(whiteSpace).toBe('nowrap');
      expect(maxWidth).toBe('none');
      expect(pill.style.top).toBe('');
      expect(pill.style.left).toBe('');
      expect(pill.style.opacity).toBe('');
    });
  });
});