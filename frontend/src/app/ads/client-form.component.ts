import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdsApiService } from './ads-api.service';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form class="page-panel" (ngSubmit)="submit()">
      <h1>Client</h1>
      <label>Name <input name="name" [(ngModel)]="name" required></label>
      <label><input name="active" type="checkbox" [(ngModel)]="isActive"> Active</label>
      <button type="submit">Save</button>
      <p role="status" *ngIf="saved">Saved</p>
    </form>
  `
})
export class ClientFormComponent {
  private readonly api = inject(AdsApiService);
  name = '';
  isActive = true;
  saved = false;

  submit(): void {
    this.api.createClient({ name: this.name, isActive: this.isActive }).subscribe(() => {
      this.saved = true;
    });
  }
}
