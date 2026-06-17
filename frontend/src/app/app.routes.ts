import { Routes } from '@angular/router';

import { LoginComponent } from './auth/login.component';
import { sessionGuard } from './auth/session.guard';
import { DisplayScreenComponent } from './display/display-screen.component';
import { ContentListComponent } from './content/content-list.component';
import { ContentFormComponent } from './content/content-form.component';
import { ClientListComponent } from './ads/client-list.component';
import { ClientFormComponent } from './ads/client-form.component';
import { AdListComponent } from './ads/ad-list.component';
import { AdFormComponent } from './ads/ad-form.component';
import { ReadinessComponent } from './readiness/readiness.component';
import { AdminShellComponent } from './admin/admin-shell.component';
import { ApprovedDomainsComponent } from './admin/approved-domains.component';
import { DisplayConfigurationComponent } from './admin/display-configuration.component';
import { UsersRolesComponent } from './admin/users-roles.component';
import { AdminDashboardComponent } from './admin/admin-dashboard.component';
import { dirtyFormGuard } from './shared/dirty-form.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'display', component: DisplayScreenComponent, canActivate: [sessionGuard] },
  { path: 'content', pathMatch: 'full', redirectTo: 'admin/content' },
  { path: 'content/new', pathMatch: 'full', redirectTo: 'admin/content/new' },
  { path: 'clients', pathMatch: 'full', redirectTo: 'admin/clients' },
  { path: 'clients/new', pathMatch: 'full', redirectTo: 'admin/clients/new' },
  { path: 'ads', pathMatch: 'full', redirectTo: 'admin/ads' },
  { path: 'ads/new', pathMatch: 'full', redirectTo: 'admin/ads/new' },
  { path: 'readiness', pathMatch: 'full', redirectTo: 'admin/readiness' },
  {
    path: 'admin',
    component: AdminShellComponent,
    canActivate: [sessionGuard],
    children: [
      { path: 'content', component: ContentListComponent },
      { path: 'content/new', component: ContentFormComponent, canDeactivate: [dirtyFormGuard] },
      { path: 'content/:id/edit', component: ContentFormComponent, canDeactivate: [dirtyFormGuard] },
      { path: 'clients', component: ClientListComponent },
      { path: 'clients/new', component: ClientFormComponent, canDeactivate: [dirtyFormGuard] },
      { path: 'clients/:id/edit', component: ClientFormComponent, canDeactivate: [dirtyFormGuard] },
      { path: 'ads', component: AdListComponent },
      { path: 'ads/new', component: AdFormComponent, canDeactivate: [dirtyFormGuard] },
      { path: 'ads/:id/edit', component: AdFormComponent, canDeactivate: [dirtyFormGuard] },
      { path: 'readiness', component: ReadinessComponent },
      { path: '', component: AdminDashboardComponent, pathMatch: 'full' },
      { path: 'domains', component: ApprovedDomainsComponent },
      { path: 'configuration', component: DisplayConfigurationComponent },
      { path: 'users', component: UsersRolesComponent },
    ]
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' }
];
