import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminApiService, ApprovedDomain } from './admin-api.service';

@Component({
  selector: 'app-approved-domains',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form (ngSubmit)="submit()">
      <h2>Approved domains</h2>
      <label>Domain <input name="domain" [(ngModel)]="domain" required></label>
      <label><input name="active" type="checkbox" [(ngModel)]="isActive"> Active</label>
      <button type="submit">Add domain</button>
    </form>
    <ul><li *ngFor="let item of domains">{{ item.domain }} - {{ item.isActive ? 'Active' : 'Inactive' }}</li></ul>
  `
})
export class ApprovedDomainsComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  domains: ApprovedDomain[] = [];
  domain = '';
  isActive = true;

  ngOnInit(): void {
    this.load();
  }

  submit(): void {
    this.api.createDomain({ domain: this.domain, isActive: this.isActive }).subscribe(() => this.load());
  }

  private load(): void {
    this.api.listDomains().subscribe((domains) => {
      this.domains = domains;
    });
  }
}
