import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';

import { AdItem, AdsApiService } from './ads-api.service';

@Component({
  selector: 'app-ad-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page-panel">
      <h1>Ads</h1>
      <table aria-label="Ads">
        <tr><th>Order</th><th>Label</th><th>Media</th><th>Rotation</th><th>Status</th></tr>
        <tr *ngFor="let ad of ads">
          <td>{{ ad.displayOrder }}</td>
          <td>{{ ad.label }}</td>
          <td>{{ ad.mediaFile ? ad.mediaFile.originalFilename : 'External source' }}</td>
          <td>{{ rotationSummary(ad) }}</td>
          <td>{{ ad.isActive ? 'Active' : 'Inactive' }}</td>
        </tr>
      </table>
    </section>
  `
})
export class AdListComponent implements OnInit {
  private readonly api = inject(AdsApiService);
  ads: AdItem[] = [];

  ngOnInit(): void {
    this.api.listAds().subscribe((ads) => {
      this.ads = ads;
    });
  }

  rotationSummary(ad: AdItem): string {
    const duration = ad.durationSeconds ? `${ad.durationSeconds}s` : 'default';
    const animation = ad.rotationAnimation ?? 'default';
    return `${duration}, ${animation}`;
  }
}
