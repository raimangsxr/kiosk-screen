import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdsApiService } from './ads-api.service';

@Component({
  selector: 'app-ad-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form class="page-panel" (ngSubmit)="submit()">
      <h1>Ad</h1>
      <label>Client ID <input name="clientId" [(ngModel)]="clientId" required></label>
      <label>Label <input name="label" [(ngModel)]="label" required></label>
      <label>Source <input name="source" [(ngModel)]="sourceReference" required></label>
      <label>Order <input name="order" type="number" min="1" [(ngModel)]="displayOrder"></label>
      <label><input name="active" type="checkbox" [(ngModel)]="isActive"> Active</label>
      <button type="submit">Save</button>
      <p role="status" *ngIf="saved">Saved</p>
    </form>
  `
})
export class AdFormComponent {
  private readonly api = inject(AdsApiService);
  clientId = '';
  label = '';
  sourceReference = '';
  displayOrder = 1;
  isActive = true;
  saved = false;

  submit(): void {
    this.api.createAd({
      clientId: this.clientId,
      label: this.label,
      sourceReference: this.sourceReference,
      displayOrder: this.displayOrder,
      isActive: this.isActive,
      durationSeconds: null
    }).subscribe(() => {
      this.saved = true;
    });
  }
}
