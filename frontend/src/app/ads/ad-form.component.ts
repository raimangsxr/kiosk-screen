import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdsApiService } from './ads-api.service';
import { ROTATION_ANIMATIONS, RotationAnimation } from '../shared/media-upload.models';

@Component({
  selector: 'app-ad-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form class="page-panel" (ngSubmit)="submit()">
      <h1>Ad</h1>
      <label>Client ID <input name="clientId" [(ngModel)]="clientId" required></label>
      <label>Label <input name="label" [(ngModel)]="label" required></label>
      <label>Upload image <input name="file" type="file" accept="image/*" (change)="selectFile($event)" required></label>
      <label>Order <input name="order" type="number" min="1" [(ngModel)]="displayOrder"></label>
      <label>Rotation time <input name="duration" type="number" min="1" [(ngModel)]="durationSeconds" placeholder="Default"></label>
      <label>Animation
        <select name="animation" [(ngModel)]="rotationAnimation">
          <option [ngValue]="null">Default</option>
          <option *ngFor="let animation of animations" [ngValue]="animation">{{ animation }}</option>
        </select>
      </label>
      <label>Animation duration <input name="animationDuration" type="number" min="1" [(ngModel)]="animationDurationMilliseconds" placeholder="Default"></label>
      <label><input name="active" type="checkbox" [(ngModel)]="isActive"> Active</label>
      <button type="submit" [disabled]="saving">Save</button>
      <p role="status" *ngIf="saved">Saved</p>
      <p role="alert" *ngIf="error">{{ error }}</p>
    </form>
  `
})
export class AdFormComponent {
  private readonly api = inject(AdsApiService);
  readonly animations = ROTATION_ANIMATIONS;
  clientId = '';
  label = '';
  sourceReference = '';
  selectedFile: File | null = null;
  displayOrder = 1;
  durationSeconds: number | null = null;
  rotationAnimation: RotationAnimation | null = null;
  animationDurationMilliseconds: number | null = null;
  isActive = true;
  saved = false;
  saving = false;
  error = '';

  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  submit(): void {
    this.saved = false;
    this.error = '';
    if (!this.selectedFile && !this.sourceReference) {
      this.error = 'Choose an image file before saving.';
      return;
    }
    this.saving = true;
    const payload = {
      clientId: this.clientId,
      label: this.label,
      sourceReference: this.sourceReference,
      displayOrder: this.displayOrder,
      isActive: this.isActive,
      durationSeconds: this.durationSeconds,
      rotationAnimation: this.rotationAnimation,
      animationDurationMilliseconds: this.animationDurationMilliseconds
    };
    const request = this.selectedFile ? this.api.uploadAd(payload, this.selectedFile) : this.api.createAd(payload);
    request.subscribe({
      next: () => {
        this.saved = true;
        this.saving = false;
      },
      error: (error) => {
        this.error = error?.error?.detail ?? 'Ad could not be saved.';
        this.saving = false;
      }
    });
  }
}
