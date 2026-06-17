import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminApiService, ApprovedDomain } from './admin-api.service';
import { AdminStateComponent } from '../shared/admin-state.component';
import { mapAdminError } from '../shared/admin-error-mapper';

@Component({
  selector: 'app-approved-domains',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminStateComponent],
  template: `
    <form class="page-panel" (ngSubmit)="submit()">
      <h2>Approved domains</h2>
      <label>Domain <input name="domain" [(ngModel)]="domain" required></label>
      <label><input name="active" type="checkbox" [(ngModel)]="isActive"> Active</label>
      <button type="submit">{{ editingId ? 'Save domain' : 'Add domain' }}</button>
      <button *ngIf="editingId" type="button" (click)="resetForm()">Cancel</button>
      <p role="status" *ngIf="saved">Saved</p>
      <p role="alert" *ngIf="error">{{ error }}</p>
    </form>
    <section class="page-panel">
      <app-admin-state *ngIf="!error && !domains.length" type="empty" title="No approved domains yet" message="Approve a domain before creating iframe content." />
      <table *ngIf="domains.length" aria-label="Approved domains">
        <tr><th>Domain</th><th>Status</th><th>Actions</th></tr>
        <tr *ngFor="let item of domains">
          <td>{{ item.domain }}</td>
          <td>{{ item.isActive ? 'Active' : 'Inactive' }}</td>
          <td>
            <button type="button" (click)="edit(item)">Edit</button>
            <button type="button" (click)="toggle(item)">{{ item.isActive ? 'Deactivate' : 'Reactivate' }}</button>
            <button type="button" (click)="remove(item)">Delete</button>
          </td>
        </tr>
      </table>
    </section>
  `
})
export class ApprovedDomainsComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  domains: ApprovedDomain[] = [];
  editingId = '';
  domain = '';
  isActive = true;
  saved = false;
  error = '';

  ngOnInit(): void {
    this.load();
  }

  submit(): void {
    this.saved = false;
    this.error = '';
    const payload = { domain: this.domain, isActive: this.isActive };
    const request = this.editingId ? this.api.updateDomain(this.editingId, payload) : this.api.createDomain(payload);
    request.subscribe({
      next: () => {
        this.saved = true;
        this.resetForm();
        this.load();
      },
      error: (error) => {
        this.error = mapAdminError(error, 'Approved domain could not be saved.');
      }
    });
  }

  edit(item: ApprovedDomain): void {
    this.editingId = item.id;
    this.domain = item.domain;
    this.isActive = item.isActive;
  }

  toggle(item: ApprovedDomain): void {
    this.api.updateDomain(item.id, { domain: item.domain, isActive: !item.isActive }).subscribe({
      next: () => this.load(),
      error: (error) => {
        this.error = mapAdminError(error, 'Domain status could not be changed.');
      }
    });
  }

  remove(item: ApprovedDomain): void {
    if (!window.confirm(`Delete ${item.domain}?`)) {
      return;
    }
    this.api.deleteDomain(item.id).subscribe({
      next: () => this.load(),
      error: (error) => {
        this.error = mapAdminError(error, 'Domain could not be deleted. Deactivate it if active iframe content depends on it.');
      }
    });
  }

  resetForm(): void {
    this.editingId = '';
    this.domain = '';
    this.isActive = true;
  }

  private load(): void {
    this.api.listDomains().subscribe({
      next: (domains) => {
        this.domains = domains;
      },
      error: (error) => {
        this.error = mapAdminError(error, 'Approved domains could not be loaded.');
      }
    });
  }
}
