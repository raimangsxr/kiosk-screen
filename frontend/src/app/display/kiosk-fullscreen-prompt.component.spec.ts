import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KioskFullscreenPromptComponent } from './kiosk-fullscreen-prompt.component';

describe('KioskFullscreenPromptComponent', () => {
  let fixture: ComponentFixture<KioskFullscreenPromptComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [KioskFullscreenPromptComponent]
    });
    fixture = TestBed.createComponent(KioskFullscreenPromptComponent);
  });

  it('renders nothing when visible=false', () => {
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.fullscreen-prompt')).toBeNull();
  });

  it('renders the button when visible=true', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      '[data-testid="display-fullscreen-prompt"]'
    ) as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.textContent?.trim()).toBe('Enter fullscreen');
  });

  it('emits (enter) when the button is clicked', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    const emitted: number[] = [];
    fixture.componentRef.instance.enter.subscribe(() => emitted.push(1));

    const button = fixture.nativeElement.querySelector('.fullscreen-prompt') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(emitted.length).toBe(1);
  });
});