import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminApiService, KioskConfiguration } from './admin-api.service';
import { ROTATION_ANIMATIONS } from '../shared/media-upload.models';

@Component({
  selector: 'app-display-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form *ngIf="configuration" (ngSubmit)="submit()">
      <h2>Display configuration</h2>
      <label>Name <input name="name" [(ngModel)]="configuration.name"></label>
      <label>Top duration <input name="topDuration" type="number" min="1" [(ngModel)]="configuration.defaultTopDurationSeconds"></label>
      <label>Top animation
        <select name="topAnimation" [(ngModel)]="configuration.defaultTopRotationAnimation">
          <option *ngFor="let animation of animations" [ngValue]="animation">{{ animation }}</option>
        </select>
      </label>
      <label>Top animation duration <input name="topAnimationDuration" type="number" min="1" [(ngModel)]="configuration.defaultTopAnimationDurationMilliseconds"></label>
      <label>Ad duration <input name="adDuration" type="number" min="1" [(ngModel)]="configuration.defaultAdDurationSeconds"></label>
      <label>Ad animation
        <select name="adAnimation" [(ngModel)]="configuration.defaultAdRotationAnimation">
          <option *ngFor="let animation of animations" [ngValue]="animation">{{ animation }}</option>
        </select>
      </label>
      <label>Ad animation duration <input name="adAnimationDuration" type="number" min="1" [(ngModel)]="configuration.defaultAdAnimationDurationMilliseconds"></label>
      <label>Inline ads <input name="inlineAdCount" type="number" min="1" [(ngModel)]="configuration.inlineAdCount"></label>
      <label>Event duration <input name="eventDuration" type="number" min="1" [(ngModel)]="configuration.configuredEventDurationMinutes"></label>
      <label><input name="enabled" type="checkbox" [(ngModel)]="configuration.isEnabled"> Enabled</label>
      <button type="submit">Save</button>
    </form>
  `
})
export class DisplayConfigurationComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  readonly animations = ROTATION_ANIMATIONS;
  configuration: KioskConfiguration | null = null;

  ngOnInit(): void {
    this.api.getConfiguration().subscribe((configuration) => {
      this.configuration = configuration;
    });
  }

  submit(): void {
    if (this.configuration) {
      this.api.updateConfiguration(this.configuration).subscribe((configuration) => {
        this.configuration = configuration;
      });
    }
  }
}
