import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hall',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="hall-page" aria-label="Application hall">
      <section class="hall-panel">
        <p class="eyebrow">Kiosk Screen</p>
        <h1>Choose where to go</h1>
        <div class="hall-actions">
          <a class="primary-action" routerLink="/display">Enter kiosk mode</a>
          <a class="secondary-action" routerLink="/admin">Open administration panel</a>
        </div>
      </section>
    </main>
  `
})
export class HallComponent {}
