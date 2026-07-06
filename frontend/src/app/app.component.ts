import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { PwaBrandingIconService } from './core/pwa/pwa-branding-icon.service';
import { PwaUpdateBannerComponent } from './core/pwa/pwa-update-banner.component';
import { PwaUpdateService } from './core/pwa/pwa-update.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PwaUpdateBannerComponent],
  template: `
    <router-outlet />
    <app-pwa-update-banner />
  `
})
export class AppComponent {
  constructor() {
    inject(PwaUpdateService);
    inject(PwaBrandingIconService);
  }
}
