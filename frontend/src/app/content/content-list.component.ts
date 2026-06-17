import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';

import { ContentApiService, ContentItem } from './content-api.service';

@Component({
  selector: 'app-content-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page-panel">
      <header>
        <h1>Top content</h1>
        <span>{{ items.length }} items</span>
      </header>
      <table aria-label="Top content items">
        <thead>
          <tr><th>Order</th><th>Title</th><th>Type</th><th>Media</th><th>Rotation</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of items">
            <td>{{ item.displayOrder }}</td>
            <td>{{ item.title }}</td>
            <td>{{ item.contentType }}</td>
            <td>{{ item.mediaFile ? item.mediaFile.originalFilename : item.contentType === 'embedded_web' ? 'Iframe' : 'External source' }}</td>
            <td>{{ rotationSummary(item) }}</td>
            <td>{{ item.isActive ? 'Active' : 'Inactive' }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  `
})
export class ContentListComponent implements OnInit {
  private readonly api = inject(ContentApiService);
  items: ContentItem[] = [];

  ngOnInit(): void {
    this.api.list().subscribe((items) => {
      this.items = items;
    });
  }

  rotationSummary(item: ContentItem): string {
    const duration = item.durationSeconds ? `${item.durationSeconds}s` : 'default';
    const animation = item.rotationAnimation ?? 'default';
    return `${duration}, ${animation}`;
  }
}
