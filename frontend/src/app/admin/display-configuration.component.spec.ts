import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminApiService, KioskConfiguration } from './admin-api.service';
import { DisplayConfigurationComponent } from './display-configuration.component';

const configuration: KioskConfiguration = {
  id: 'config-1',
  name: 'Main kiosk',
  defaultTopDurationSeconds: 10,
  defaultAdDurationSeconds: 8,
  defaultTopRotationAnimation: 'fade',
  defaultAdRotationAnimation: 'slide',
  defaultTopAnimationDurationMilliseconds: 300,
  defaultAdAnimationDurationMilliseconds: 300,
  inlineAdCount: 2,
  remoteControlPollingSeconds: 3,
  configuredEventDurationMinutes: 60,
  isEnabled: true
};

describe('DisplayConfigurationComponent', () => {
  it('validates positive timing and inline ad values before save', () => {
    const api = jasmine.createSpyObj<AdminApiService>('AdminApiService', ['getConfiguration', 'updateConfiguration']);
    api.getConfiguration.and.returnValue(of({ ...configuration }));
    api.updateConfiguration.and.returnValue(of({ ...configuration }));

    TestBed.configureTestingModule({
      imports: [DisplayConfigurationComponent],
      providers: [{ provide: AdminApiService, useValue: api }]
    });
    const fixture = TestBed.createComponent(DisplayConfigurationComponent);
    fixture.detectChanges();

    fixture.componentInstance.configuration!.inlineAdCount = 0;
    fixture.componentInstance.submit();

    expect(api.updateConfiguration).not.toHaveBeenCalled();
    expect(fixture.componentInstance.error).toContain('positive values');
  });
});
