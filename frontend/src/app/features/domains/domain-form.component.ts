import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Subject, takeUntil } from 'rxjs';

import { DomainsFacade } from './domains.facade';
import { ApprovedDomain } from '../../core/api/admin.api';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { AdminStateComponent } from '../../shared/admin-state.component';
import { FormPageComponent } from '../../shared/ui/form-page.component';
import { nonBlankString } from '../../shared/forms/admin-validators';
import { DirtyFormAware } from '../../shared/dirty-form.models';

interface DomainFormValue {
  domain: string;
  isActive: boolean;
}

@Component({
  selector: 'app-domain-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    PageHeaderComponent,
    AdminStateComponent,
    FormPageComponent
  ],
  template: `
    <app-page-header
      eyebrow="Administration"
      [title]="formTitle()"
      description="Approve a host from which iframe content may load. Deactivate to keep it out of the allow-list."
    />

    <form
      *ngIf="form"
      [formGroup]="form"
      (ngSubmit)="submit()"
      class="domain-form"
      novalidate
      aria-label="Approved domain form"
    >
      <app-form-page [loading]="loading()">
        <app-admin-state
          *ngIf="loadError() as error"
          kind="error"
          title="Could not load domain"
          [message]="error.message"
        />

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Domain</mat-label>
          <input
            matInput
            formControlName="domain"
            required
            maxlength="255"
            placeholder="example.com"
            autocomplete="off"
          />
          <mat-hint>Host only, no scheme. Matches iframe source URLs.</mat-hint>
          <mat-error *ngIf="form.controls.domain.hasError('required')">Domain is required.</mat-error>
          <mat-error *ngIf="form.controls.domain.hasError('nonBlankString')">Domain cannot be blank.</mat-error>
        </mat-form-field>

        <div class="domain-form__toggle">
          <mat-slide-toggle formControlName="isActive">Active</mat-slide-toggle>
          <span class="domain-form__hint" *ngIf="!form.controls.isActive.value">
            Inactive domains keep their configuration but are excluded from iframe allow-listing.
          </span>
        </div>

        <app-admin-state
          *ngIf="saveError() as error"
          kind="error"
          title="Could not save domain"
          [message]="error.message"
        />

        <div formPageActions>
          <a mat-button routerLink="/admin/domains">Cancel</a>
          <button
            mat-flat-button
            color="primary"
            type="submit"
            [disabled]="form.invalid || facade.saving() || loading()"
          >
            <mat-icon aria-hidden="true">save</mat-icon>
            {{ facade.saving() ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </app-form-page>
    </form>
  `,
  styles: [
    `
      .domain-form {
        display: block;
      }
      mat-form-field {
        width: 100%;
      }
      .domain-form__toggle {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        padding: 4px 0;
      }
      .domain-form__hint {
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
      }
    `
  ]
})
export class DomainFormComponent implements OnInit, OnDestroy, DirtyFormAware {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly facade = inject(DomainsFacade);
  private readonly destroy$ = new Subject<void>();

  protected readonly domainId = signal<string>('');
  protected readonly loading = signal(false);
  protected readonly saveError = signal<{ code: string; message: string; category: string } | null>(null);
  protected readonly loadError = signal<{ code: string; message: string; category: string } | null>(null);

  protected form: FormGroup<{
    domain: FormControl<string>;
    isActive: FormControl<boolean>;
  }> | null = null;

  private initialSnapshot = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.domainId.set(id);
    this.buildForm();

    if (id) {
      this.loading.set(true);
      this.facade.loadDomain(id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          const current = this.facade.current();
          if (current) {
            this.populate(current);
          } else {
            this.loadError.set(this.facade.error() ?? {
              code: 'not_found_domain',
              message: 'Approved domain could not be found.',
              category: 'not-found'
            });
          }
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set(this.facade.error());
          this.loading.set(false);
        }
      });
    } else {
      this.markPristine();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.facade.clearCurrent();
  }

  hasUnsavedChanges(): boolean {
    if (!this.form || this.facade.saving()) {
      return false;
    }
    return this.snapshot() !== this.initialSnapshot;
  }

  protected formTitle(): string {
    return this.domainId() ? 'Edit approved domain' : 'New approved domain';
  }

  submit(): void {
    if (!this.form || this.form.invalid) {
      this.form?.markAllAsTouched();
      return;
    }
    const value = this.form.value as DomainFormValue;
    const payload: Omit<ApprovedDomain, 'id'> = {
      domain: value.domain.trim().toLowerCase(),
      isActive: value.isActive
    };
    this.saveError.set(null);
    const id = this.domainId() || undefined;
    this.facade.save(payload, id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.open(`Saved ${payload.domain}.`, 'Dismiss', { duration: 3000 });
        this.markPristine();
        this.router.navigate(['/admin/domains']);
      },
      error: () => {
        this.saveError.set(this.facade.error());
      }
    });
  }

  private buildForm(): void {
    this.form = this.fb.nonNullable.group({
      domain: this.fb.nonNullable.control('', {
        validators: [Validators.required, nonBlankString('nonBlankString')]
      }),
      isActive: this.fb.nonNullable.control(true)
    });
  }

  private populate(item: ApprovedDomain): void {
    if (!this.form) {
      return;
    }
    this.form.patchValue({
      domain: item.domain,
      isActive: item.isActive
    });
    this.markPristine();
  }

  private markPristine(): void {
    this.initialSnapshot = this.snapshot();
  }

  private snapshot(): string {
    if (!this.form) {
      return '';
    }
    const v = this.form.value as DomainFormValue;
    return JSON.stringify({ domain: v.domain, isActive: v.isActive });
  }
}
