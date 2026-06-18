import { Routes } from '@angular/router';

import { LoginComponent } from './auth/login.component';
import { sessionGuard } from './auth/session.guard';
import { DisplayScreenComponent } from './features/display/display-screen.component';
import { HallComponent } from './features/hall/hall.component';
import { ContentListComponent } from './features/content/content-list.component';
import { ContentFormComponent } from './features/content/content-form.component';
import { ClientListComponent } from './features/clients/client-list.component';
import { ClientFormComponent } from './features/clients/client-form.component';
import { AdListComponent } from './features/ads/ad-list.component';
import { AdFormComponent } from './features/ads/ad-form.component';
import { ReadinessComponent } from './features/readiness/readiness.component';
import { AdminShellComponent } from './features/admin-shell/admin-shell.component';
import { DomainListComponent, DomainFormComponent } from './features/domains/domains.api';
import { DisplayConfigComponent } from './features/display-config/display-config.component';
import { UsersListComponent, UserFormComponent } from './features/users/users.component';
import { AdminDashboardComponent } from './features/dashboard/dashboard.component';
import { dirtyFormGuard } from './shared/dirty-form.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'hall', component: HallComponent, canActivate: [sessionGuard] },
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
      { path: 'domains', component: DomainListComponent },
      { path: 'domains/new', component: DomainFormComponent, canDeactivate: [dirtyFormGuard] },
      { path: 'domains/:id/edit', component: DomainFormComponent, canDeactivate: [dirtyFormGuard] },
      { path: 'configuration', component: DisplayConfigComponent },
      { path: 'users', component: UsersListComponent },
      { path: 'users/new', component: UserFormComponent, canDeactivate: [dirtyFormGuard] },
      { path: 'users/:id/edit', component: UserFormComponent, canDeactivate: [dirtyFormGuard] },
    ]
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' }
];
