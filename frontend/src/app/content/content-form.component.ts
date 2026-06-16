import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ContentApiService } from './content-api.service';

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
      <label>Source <input name="source" [(ngModel)]="sourceReference" required></label>
      <label>Order <input name="order" type="number" min="1" [(ngModel)]="displayOrder"></label>
      <label><input name="active" type="checkbox" [(ngModel)]="isActive"> Active</label>
      <button type="submit">Save</button>
      <p role="status" *ngIf="saved">Saved</p>
    </form>
  `
})
export class ContentFormComponent {
  private readonly api = inject(ContentApiService);
  title = '';
  contentType: 'photo' | 'video' | 'embedded_web' = 'photo';
  sourceReference = '';
  displayOrder = 1;
  isActive = true;
  saved = false;

  submit(): void {
    this.api.create({
      title: this.title,
      contentType: this.contentType,
      sourceReference: this.sourceReference,
      displayOrder: this.displayOrder,
      isActive: this.isActive,
      durationSeconds: null
    }).subscribe(() => {
      this.saved = true;
    });
  }
}
