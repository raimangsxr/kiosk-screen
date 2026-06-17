import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ContentApiService, ContentItem } from './content-api.service';
import { AdminStateComponent } from '../shared/admin-state.component';
import { mapAdminError } from '../shared/admin-error-mapper';

@Component({
  selector: 'app-content-list',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminStateComponent],
  template: `
    <section class="page-panel">
      <header>
        <h1>Top content</h1>
        <span>{{ items.length }} items</span>
        <a routerLink="/admin/content/new">Add content</a>
      </header>
      <app-admin-state *ngIf="error" type="error" title="Content unavailable" [message]="error" />
      <app-admin-state *ngIf="!error && !items.length" type="empty" title="No content yet" message="Add photos, videos, or iframe content for the top region." actionLabel="Add content" actionRoute="/admin/content/new" />
      <table *ngIf="items.length" aria-label="Top content items">
        <thead>
          <tr><th>Order</th><th>Title</th><th>Type</th><th>Media</th><th>Rotation</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of items">
            <td>{{ item.displayOrder }}</td>
            <td>{{ item.title }}</td>
            <td>{{ item.contentType }}</td>
            <td>{{ item.mediaFile ? item.mediaFile.originalFilename : item.contentType === 'embedded_web' ? 'Iframe' : 'External source' }}</td>
            <td>{{ rotationSummary(item) }}</td>
            <td>{{ item.isActive ? 'Active' : 'Inactive' }}</td>
            <td>
              <a [routerLink]="['/admin/content', item.id, 'edit']">Edit</a>
              <button type="button" (click)="remove(item)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  `
})
export class ContentListComponent implements OnInit {
  private readonly api = inject(ContentApiService);
  items: ContentItem[] = [];
  error = '';

  ngOnInit(): void {
    this.load();
  }

  rotationSummary(item: ContentItem): string {
    const duration = item.durationSeconds ? `${item.durationSeconds}s` : 'default';
    const animation = item.rotationAnimation ?? 'default';
    return `${duration}, ${animation}`;
  }

  remove(item: ContentItem): void {
    if (!window.confirm(`Delete ${item.title}?`)) {
      return;
    }
    this.api.delete(item.id).subscribe({
      next: () => this.load(),
      error: (error) => {
        this.error = mapAdminError(error, 'Content could not be deleted.');
      }
    });
  }

  private load(): void {
    this.api.list().subscribe({
      next: (items) => {
        this.items = items;
        this.error = '';
      },
      error: (error) => {
        this.error = mapAdminError(error, 'Content could not be loaded.');
      }
    });
  }
}
