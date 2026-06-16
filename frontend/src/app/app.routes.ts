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

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'display', component: DisplayScreenComponent, canActivate: [sessionGuard] },
  { path: 'content', component: ContentListComponent, canActivate: [sessionGuard] },
  { path: 'content/new', component: ContentFormComponent, canActivate: [sessionGuard] },
  { path: 'clients', component: ClientListComponent, canActivate: [sessionGuard] },
  { path: 'clients/new', component: ClientFormComponent, canActivate: [sessionGuard] },
  { path: 'ads', component: AdListComponent, canActivate: [sessionGuard] },
  { path: 'ads/new', component: AdFormComponent, canActivate: [sessionGuard] },
  { path: 'readiness', component: ReadinessComponent, canActivate: [sessionGuard] },
  {
    path: 'admin',
    component: AdminShellComponent,
    canActivate: [sessionGuard],
    children: [
      { path: 'domains', component: ApprovedDomainsComponent },
      { path: 'configuration', component: DisplayConfigurationComponent },
      { path: 'users', component: UsersRolesComponent },
      { path: '', pathMatch: 'full', redirectTo: 'configuration' }
    ]
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' }
];
