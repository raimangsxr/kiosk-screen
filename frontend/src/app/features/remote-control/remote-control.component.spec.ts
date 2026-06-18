import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { RemoteControlComponent } from './remote-control.component';
import { RemoteControlFacade } from './remote-control.facade';
import { RemoteControlState } from './remote-control.models';

const state: RemoteControlState = {
  contentMode: 'loop',
  selectedContentId: null,
  selectedIframe: null,
  adsVisible: true,
  updatedAt: '2026-06-18T00:00:00Z',
  displaySessionActive: true
};

describe('RemoteControlComponent', () => {
  let fixture: ComponentFixture<RemoteControlComponent>;
  let facade: jasmine.SpyObj<RemoteControlFacade>;

  beforeEach(async () => {
    facade = jasmine.createSpyObj<RemoteControlFacade>(
      'RemoteControlFacade',
      ['refresh', 'setLoopMode', 'setIframeMode', 'setAdsVisible'],
      {
        state: signal(state).asReadonly(),
        iframeOptions: signal([
          { id: 'content-1', title: 'Agenda', sourceReference: 'https://example.org/agenda', isActive: true }
        ]).asReadonly(),
        loading: signal(false).asReadonly(),
        saving: signal(false).asReadonly(),
        ready: signal(true).asReadonly(),
        error: signal(null).asReadonly()
      }
    );
    facade.refresh.and.returnValue(of({ state, options: { items: [] } }));
    facade.setLoopMode.and.returnValue(of(state));
    facade.setIframeMode.and.returnValue(of({ ...state, contentMode: 'iframe', selectedContentId: 'content-1' }));
    facade.setAdsVisible.and.returnValue(of({ ...state, adsVisible: false }));

    await TestBed.configureTestingModule({
      imports: [RemoteControlComponent, NoopAnimationsModule],
      providers: [{ provide: RemoteControlFacade, useValue: facade }]
    }).compileComponents();

    fixture = TestBed.createComponent(RemoteControlComponent);
    fixture.detectChanges();
  });

  it('loads remote control state on init and shows current mode controls', () => {
    const text = fixture.nativeElement.textContent;

    expect(facade.refresh).toHaveBeenCalled();
    expect(text).toContain('Remote control');
    expect(text).toContain('Loop');
    expect(text).toContain('Iframe');
    expect(text).toContain('Agenda');
    expect(text).toContain('Ads');
  });

  it('switches to loop mode immediately from visible controls', () => {
    fixture.componentInstance.selectLoopMode();

    expect(facade.setLoopMode).toHaveBeenCalled();
  });

  it('switches to selected iframe immediately from visible controls', () => {
    fixture.componentInstance.selectIframe('content-1');

    expect(facade.setIframeMode).toHaveBeenCalledWith('content-1');
  });

  it('shows safe update errors', () => {
    facade.setIframeMode.and.returnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.selectIframe('content-1');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Could not update remote control');
  });

  it('updates ads visibility from the toggle', () => {
    fixture.componentInstance.setAdsVisible(false);

    expect(facade.setAdsVisible).toHaveBeenCalledWith(false);
  });
});
