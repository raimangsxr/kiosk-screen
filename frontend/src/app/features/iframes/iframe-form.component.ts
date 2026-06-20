import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { DirtyFormAware } from '../../shared/dirty-form.models';

import { IframeFacade } from './iframe.facade';

@Component({
  selector: 'app-iframe-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <section class="admin-form-page">
      <header>
        <h1>{{ iframeId ? 'Edit iframe' : 'New iframe' }}</h1>
      </header>
      <form [formGroup]="form" (ngSubmit)="submit()" class="admin-form">
        <mat-form-field appearance="outline">
          <mat-label>URL</mat-label>
          <input matInput formControlName="url" autocomplete="off" />
          <mat-error *ngIf="form.controls.url.hasError('required')">URL is required.</mat-error>
          <mat-error *ngIf="form.controls.url.hasError('pattern')">Enter a valid http(s) URL.</mat-error>
        </mat-form-field>
        <p class="admin-form__error" *ngIf="facade.error() as error">{{ error.message }}</p>
        <div class="admin-form__actions">
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || facade.saving()">Save</button>
          <a mat-button routerLink="/admin/iframes">Cancel</a>
        </div>
      </form>
    </section>
  `,
})
export class IframeFormComponent implements OnInit, DirtyFormAware {
  protected readonly facade = inject(IframeFacade);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected iframeId: string | null = null;
  private initialSnapshot = '';

  protected readonly form = this.fb.nonNullable.group({
    url: ['', [Validators.required, Validators.pattern(/^https?:\/\/\S+$/)]],
  });

  ngOnInit(): void {
    this.iframeId = this.route.snapshot.paramMap.get('id');
    this.facade.clearCurrent();
    this.initialSnapshot = this.snapshot();
    if (this.iframeId) {
      this.facade.load(this.iframeId).subscribe((item) => {
        this.form.patchValue({ url: item.url });
        this.initialSnapshot = this.snapshot();
      });
    }
  }

  hasUnsavedChanges(): boolean {
    if (this.facade.saving()) {
      return false;
    }
    return this.snapshot() !== this.initialSnapshot;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.facade.save({ url: this.form.controls.url.value.trim() }, this.iframeId ?? undefined).subscribe(() => {
      this.markPristine();
      void this.router.navigate(['/admin/iframes']);
    });
  }

  private snapshot(): string {
    return JSON.stringify({ url: this.form.controls.url.value });
  }

  private markPristine(): void {
    this.initialSnapshot = this.snapshot();
  }
}
