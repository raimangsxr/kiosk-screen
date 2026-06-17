import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdsApiService, Client } from './ads-api.service';
import { AdminStateComponent } from '../shared/admin-state.component';
import { mapAdminError } from '../shared/admin-error-mapper';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminStateComponent],
  template: `
    <section class="page-panel">
      <header>
        <h1>Clients</h1>
        <a routerLink="/admin/clients/new">Add client</a>
      </header>
      <app-admin-state *ngIf="error" type="error" title="Clients unavailable" [message]="error" />
      <app-admin-state *ngIf="!error && !clients.length" type="empty" title="No clients yet" message="Create a client before uploading ads." actionLabel="Add client" actionRoute="/admin/clients/new" />
      <table *ngIf="clients.length" aria-label="Clients">
        <tr><th>Name</th><th>Status</th><th>Actions</th></tr>
        <tr *ngFor="let client of clients">
          <td>{{ client.name }}</td>
          <td>{{ client.isActive ? 'Active' : 'Inactive' }}</td>
          <td>
            <a [routerLink]="['/admin/clients', client.id, 'edit']">Edit</a>
            <button type="button" (click)="toggle(client)">{{ client.isActive ? 'Deactivate' : 'Reactivate' }}</button>
            <button type="button" (click)="remove(client)">Delete</button>
          </td>
        </tr>
      </table>
    </section>
  `
})
export class ClientListComponent implements OnInit {
  private readonly api = inject(AdsApiService);
  clients: Client[] = [];
  error = '';

  ngOnInit(): void {
    this.load();
  }

  toggle(client: Client): void {
    this.api.updateClient(client.id, { name: client.name, isActive: !client.isActive }).subscribe({
      next: () => this.load(),
      error: (error) => {
        this.error = mapAdminError(error, 'Client status could not be changed.');
      }
    });
  }

  remove(client: Client): void {
    if (!window.confirm(`Delete ${client.name}?`)) {
      return;
    }
    this.api.deleteClient(client.id).subscribe({
      next: () => this.load(),
      error: (error) => {
        this.error = mapAdminError(error, 'Client could not be deleted. Deactivate it if active ads depend on it.');
      }
    });
  }

  private load(): void {
    this.api.listClients().subscribe({
      next: (clients) => {
        this.clients = clients;
        this.error = '';
      },
      error: (error) => {
        this.error = mapAdminError(error, 'Clients could not be loaded.');
      }
    });
  }
}
