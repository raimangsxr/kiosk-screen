import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';

import { AdsApiService, Client } from './ads-api.service';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page-panel">
      <h1>Clients</h1>
      <ul>
        <li *ngFor="let client of clients">{{ client.name }} - {{ client.isActive ? 'Active' : 'Inactive' }}</li>
      </ul>
    </section>
  `
})
export class ClientListComponent implements OnInit {
  private readonly api = inject(AdsApiService);
  clients: Client[] = [];

  ngOnInit(): void {
    this.api.listClients().subscribe((clients) => {
      this.clients = clients;
    });
  }
}
