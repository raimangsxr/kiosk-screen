import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdItem, AdsApiService } from './ads-api.service';
import { AdminStateComponent } from '../shared/admin-state.component';
import { mapAdminError } from '../shared/admin-error-mapper';

@Component({
  selector: 'app-ad-list',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminStateComponent],
  template: `
    <section class="page-panel">
      <header>
        <h1>Ads</h1>
        <a routerLink="/admin/ads/new">Add ad</a>
      </header>
      <app-admin-state *ngIf="error" type="error" title="Ads unavailable" [message]="error" />
      <app-admin-state *ngIf="!error && !ads.length" type="empty" title="No ads yet" message="Upload client image ads for the bottom region." actionLabel="Add ad" actionRoute="/admin/ads/new" />
      <table *ngIf="ads.length" aria-label="Ads">
        <tr><th>Order</th><th>Label</th><th>Client</th><th>Media</th><th>Rotation</th><th>Status</th><th>Actions</th></tr>
        <tr *ngFor="let ad of ads">
          <td>{{ ad.displayOrder }}</td>
          <td>{{ ad.label }}</td>
          <td>{{ ad.clientId }}</td>
          <td>{{ ad.mediaFile ? ad.mediaFile.originalFilename : 'External source' }}</td>
          <td>{{ rotationSummary(ad) }}</td>
          <td>{{ ad.isActive ? 'Active' : 'Inactive' }}</td>
          <td>
            <a [routerLink]="['/admin/ads', ad.id, 'edit']">Edit</a>
            <button type="button" (click)="remove(ad)">Delete</button>
          </td>
        </tr>
      </table>
    </section>
  `
})
export class AdListComponent implements OnInit {
  private readonly api = inject(AdsApiService);
  ads: AdItem[] = [];
  error = '';

  ngOnInit(): void {
    this.load();
  }

  rotationSummary(ad: AdItem): string {
    const duration = ad.durationSeconds ? `${ad.durationSeconds}s` : 'default';
    const animation = ad.rotationAnimation ?? 'default';
    return `${duration}, ${animation}`;
  }

  remove(ad: AdItem): void {
    if (!window.confirm(`Delete ${ad.label}?`)) {
      return;
    }
    this.api.deleteAd(ad.id).subscribe({
      next: () => this.load(),
      error: (error) => {
        this.error = mapAdminError(error, 'Ad could not be deleted.');
      }
    });
  }

  private load(): void {
    this.api.listAds().subscribe({
      next: (ads) => {
        this.ads = ads;
        this.error = '';
      },
      error: (error) => {
        this.error = mapAdminError(error, 'Ads could not be loaded.');
      }
    });
  }
}
