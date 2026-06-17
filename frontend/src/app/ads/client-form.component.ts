import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AdsApiService, Client } from './ads-api.service';
import { DirtyFormAware } from '../shared/dirty-form.models';
import { mapAdminError } from '../shared/admin-error-mapper';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <form class="page-panel" (ngSubmit)="submit()">
      <h1>{{ clientId ? 'Edit client' : 'Client' }}</h1>
      <label>Name <input name="name" [(ngModel)]="name" required></label>
      <label><input name="active" type="checkbox" [(ngModel)]="isActive"> Active</label>
      <button type="submit">Save</button>
      <a routerLink="/admin/clients">Cancel</a>
      <p role="status" *ngIf="saved">Saved</p>
      <p role="alert" *ngIf="error">{{ error }}</p>
    </form>
  `
})
export class ClientFormComponent implements OnInit, DirtyFormAware {
  private readonly api = inject(AdsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  clientId = '';
  name = '';
  isActive = true;
  saved = false;
  error = '';
  private initialSnapshot = '';

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.clientId) {
      this.markPristine();
      return;
    }
    this.api.listClients().subscribe({
      next: (clients) => {
        const client = clients.find((item) => item.id === this.clientId);
        if (client) {
          this.populate(client);
        } else {
          this.error = 'Client could not be found.';
        }
      },
      error: (error) => {
        this.error = mapAdminError(error, 'Client could not be loaded.');
      }
    });
  }

  submit(): void {
    this.error = '';
    const request = this.clientId
      ? this.api.updateClient(this.clientId, { name: this.name, isActive: this.isActive })
      : this.api.createClient({ name: this.name, isActive: this.isActive });
    request.subscribe({
      next: (client) => {
        this.populate(client);
        this.saved = true;
        this.router.navigate(['/admin/clients']);
      },
      error: (error) => {
        this.error = mapAdminError(error, 'Client could not be saved.');
      }
    });
  }

  hasUnsavedChanges(): boolean {
    return this.snapshot() !== this.initialSnapshot;
  }

  private populate(client: Client): void {
    this.clientId = client.id;
    this.name = client.name;
    this.isActive = client.isActive;
    this.markPristine();
  }

  private markPristine(): void {
    this.initialSnapshot = this.snapshot();
  }

  private snapshot(): string {
    return JSON.stringify({ name: this.name, isActive: this.isActive });
  }
}
