import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-state',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="admin-state" [class.error]="type === 'error'" [class.success]="type === 'success'" [attr.role]="type === 'error' ? 'alert' : 'status'">
      <strong>{{ title }}</strong>
      <p *ngIf="message">{{ message }}</p>
      <a *ngIf="actionRoute && actionLabel" [routerLink]="actionRoute">{{ actionLabel }}</a>
    </section>
  `
})
export class AdminStateComponent {
  @Input() type: 'empty' | 'error' | 'success' | 'info' = 'info';
  @Input() title = '';
  @Input() message = '';
  @Input() actionLabel = '';
  @Input() actionRoute = '';
}
