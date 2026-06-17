import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AdsApiService, AdItem, Client } from './ads-api.service';
import { ROTATION_ANIMATIONS, RotationAnimation } from '../shared/media-upload.models';
import { DirtyFormAware } from '../shared/dirty-form.models';
import { mapAdminError } from '../shared/admin-error-mapper';

@Component({
  selector: 'app-ad-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <form class="page-panel" (ngSubmit)="submit()">
      <h1>{{ adId ? 'Edit ad' : 'Ad' }}</h1>
      <label>Client
        <select name="clientId" [(ngModel)]="clientId" required>
          <option value="">Select client</option>
          <option *ngFor="let client of clients" [value]="client.id">{{ client.name }} ({{ client.isActive ? 'active' : 'inactive' }})</option>
        </select>
      </label>
      <label>Label <input name="label" [(ngModel)]="label" required></label>
      <label>Upload image <input name="file" type="file" accept="image/*" (change)="selectFile($event)" [required]="!adId"></label>
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
      <a routerLink="/admin/ads">Cancel</a>
      <p role="status" *ngIf="saved">Saved</p>
      <p role="alert" *ngIf="error">{{ error }}</p>
    </form>
  `
})
export class AdFormComponent implements OnInit, DirtyFormAware {
  private readonly api = inject(AdsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly animations = ROTATION_ANIMATIONS;
  adId = '';
  clients: Client[] = [];
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
  private initialSnapshot = '';

  ngOnInit(): void {
    this.adId = this.route.snapshot.paramMap.get('id') ?? '';
    this.api.listClients().subscribe((clients) => {
      this.clients = clients;
    });
    if (this.adId) {
      this.api.getAd(this.adId).subscribe({
        next: (ad) => this.populate(ad),
        error: (error) => {
          this.error = mapAdminError(error, 'Ad could not be loaded.');
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
    if (!this.selectedFile && !this.sourceReference && !this.adId) {
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
    const request = this.adId
      ? this.api.updateAd(this.adId, payload)
      : this.selectedFile ? this.api.uploadAd(payload, this.selectedFile) : this.api.createAd(payload);
    request.subscribe({
      next: (ad) => {
        this.populate(ad);
        this.saved = true;
        this.saving = false;
        this.router.navigate(['/admin/ads']);
      },
      error: (error) => {
        this.error = mapAdminError(error, 'Ad could not be saved.');
        this.saving = false;
      }
    });
  }

  hasUnsavedChanges(): boolean {
    return this.snapshot() !== this.initialSnapshot && !this.saving;
  }

  private populate(ad: AdItem): void {
    this.adId = ad.id;
    this.clientId = ad.clientId;
    this.label = ad.label;
    this.sourceReference = ad.sourceReference;
    this.displayOrder = ad.displayOrder;
    this.durationSeconds = ad.durationSeconds ?? null;
    this.rotationAnimation = ad.rotationAnimation ?? null;
    this.animationDurationMilliseconds = ad.animationDurationMilliseconds ?? null;
    this.isActive = ad.isActive;
    this.markPristine();
  }

  private markPristine(): void {
    this.initialSnapshot = this.snapshot();
  }

  private snapshot(): string {
    return JSON.stringify({
      clientId: this.clientId,
      label: this.label,
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
