import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ContentApiService, ContentItem, ContentItemRequest } from './content-api.service';
import { ROTATION_ANIMATIONS, RotationAnimation } from '../shared/media-upload.models';
import { DirtyFormAware } from '../shared/dirty-form.models';
import { mapAdminError } from '../shared/admin-error-mapper';

@Component({
  selector: 'app-content-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <form class="page-panel" (ngSubmit)="submit()">
      <h1>{{ contentId ? 'Edit content item' : 'Content item' }}</h1>
      <label>Title <input name="title" [(ngModel)]="title" required></label>
      <label>Type
        <select name="type" [(ngModel)]="contentType">
          <option value="photo">Photo</option>
          <option value="video">Video</option>
          <option value="embedded_web">Embedded web</option>
        </select>
      </label>
      <label *ngIf="contentType === 'embedded_web'">Iframe source <input name="source" [(ngModel)]="sourceReference" [required]="contentType === 'embedded_web'"></label>
      <label *ngIf="contentType !== 'embedded_web'">Upload file <input name="file" type="file" [accept]="contentType === 'photo' ? 'image/*' : 'video/*'" (change)="selectFile($event)" [required]="!contentId"></label>
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
      <a routerLink="/admin/content">Cancel</a>
      <p role="status" *ngIf="saved">Saved</p>
      <p role="alert" *ngIf="error">{{ error }}</p>
    </form>
  `
})
export class ContentFormComponent implements OnInit, DirtyFormAware {
  private readonly api = inject(ContentApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly animations = ROTATION_ANIMATIONS;
  contentId = '';
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
  private initialSnapshot = '';

  ngOnInit(): void {
    this.contentId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.contentId) {
      this.api.get(this.contentId).subscribe({
        next: (item) => this.populate(item),
        error: (error) => {
          this.error = mapAdminError(error, 'Content could not be loaded.');
        }
      });
    } else {
      this.markPristine();
    }
  }

  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  submit(): void {
    this.saved = false;
    this.error = '';
    const payload: ContentItemRequest = {
      title: this.title,
      contentType: this.contentType,
      sourceReference: this.sourceReference,
      mediaFile: null,
      displayOrder: this.displayOrder,
      isActive: this.isActive,
      durationSeconds: this.durationSeconds,
      rotationAnimation: this.rotationAnimation,
      animationDurationMilliseconds: this.animationDurationMilliseconds
    };
    if (this.contentType !== 'embedded_web' && !this.selectedFile && !this.sourceReference && !this.contentId) {
      this.error = 'Choose an image or video file before saving.';
      return;
    }
    this.saving = true;
    const request = this.contentId
      ? this.api.update(this.contentId, payload)
      : this.contentType === 'embedded_web'
        ? this.api.createIframe(payload)
        : this.selectedFile
          ? this.api.upload(payload, this.selectedFile)
          : this.api.create(payload);
    request.subscribe({
      next: (item) => {
        this.populate(item);
        this.saved = true;
        this.saving = false;
        this.router.navigate(['/admin/content']);
      },
      error: (error) => {
        this.error = mapAdminError(error, 'Content could not be saved.');
        this.saving = false;
      }
    });
  }

  hasUnsavedChanges(): boolean {
    return this.snapshot() !== this.initialSnapshot && !this.saving;
  }

  private populate(item: ContentItem): void {
    this.contentId = item.id;
    this.title = item.title;
    this.contentType = item.contentType;
    this.sourceReference = item.sourceReference;
    this.displayOrder = item.displayOrder;
    this.durationSeconds = item.durationSeconds ?? null;
    this.rotationAnimation = item.rotationAnimation ?? null;
    this.animationDurationMilliseconds = item.animationDurationMilliseconds ?? null;
    this.isActive = item.isActive;
    this.markPristine();
  }

  private markPristine(): void {
    this.initialSnapshot = this.snapshot();
  }

  private snapshot(): string {
    return JSON.stringify({
      title: this.title,
      contentType: this.contentType,
      sourceReference: this.sourceReference,
      displayOrder: this.displayOrder,
      durationSeconds: this.durationSeconds,
      rotationAnimation: this.rotationAnimation,
      animationDurationMilliseconds: this.animationDurationMilliseconds,
      isActive: this.isActive,
      selectedFile: this.selectedFile?.name ?? ''
    });
  }
}
