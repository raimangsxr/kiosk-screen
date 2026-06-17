import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ContentApiService } from './content-api.service';
import { ROTATION_ANIMATIONS, RotationAnimation } from '../shared/media-upload.models';

@Component({
  selector: 'app-content-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form class="page-panel" (ngSubmit)="submit()">
      <h1>Content item</h1>
      <label>Title <input name="title" [(ngModel)]="title" required></label>
      <label>Type
        <select name="type" [(ngModel)]="contentType">
          <option value="photo">Photo</option>
          <option value="video">Video</option>
          <option value="embedded_web">Embedded web</option>
        </select>
      </label>
      <label *ngIf="contentType === 'embedded_web'">Iframe source <input name="source" [(ngModel)]="sourceReference" [required]="contentType === 'embedded_web'"></label>
      <label *ngIf="contentType !== 'embedded_web'">Upload file <input name="file" type="file" [accept]="contentType === 'photo' ? 'image/*' : 'video/*'" (change)="selectFile($event)" required></label>
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
export class ContentFormComponent {
  private readonly api = inject(ContentApiService);
  readonly animations = ROTATION_ANIMATIONS;
  title = '';
  contentType: 'photo' | 'video' | 'embedded_web' = 'photo';
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
    const payload = {
      title: this.title,
      contentType: this.contentType,
      sourceReference: this.sourceReference,
      displayOrder: this.displayOrder,
      isActive: this.isActive,
      durationSeconds: this.durationSeconds,
      rotationAnimation: this.rotationAnimation,
      animationDurationMilliseconds: this.animationDurationMilliseconds
    };
    if (this.contentType !== 'embedded_web' && !this.selectedFile && !this.sourceReference) {
      this.error = 'Choose an image or video file before saving.';
      return;
    }
    this.saving = true;
    const request = this.contentType === 'embedded_web'
      ? this.api.createIframe(payload)
      : this.selectedFile
        ? this.api.upload(payload, this.selectedFile)
        : this.api.create(payload);
    request.subscribe({
      next: () => {
      this.saved = true;
      this.saving = false;
      },
      error: (error) => {
        this.error = error?.error?.detail ?? 'Content could not be saved.';
        this.saving = false;
      }
    });
  }
}
