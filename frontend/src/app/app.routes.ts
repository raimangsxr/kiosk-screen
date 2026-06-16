import { Routes } from '@angular/router';

import { LoginComponent } from './auth/login.component';
import { sessionGuard } from './auth/session.guard';
import { DisplayScreenComponent } from './display/display-screen.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'display', component: DisplayScreenComponent, canActivate: [sessionGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'login' }
];
