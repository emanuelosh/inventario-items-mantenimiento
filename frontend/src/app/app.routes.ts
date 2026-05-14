import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { roleGuard } from './core/role.guard';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./auth/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./pages/items/items.component').then((m) => m.ItemsComponent)
      },
      {
        path: 'movements',
        loadComponent: () =>
          import('./pages/movements/movements.component').then((m) => m.MovementsComponent)
      },
      {
        path: 'reports',
        canActivate: [roleGuard],
        data: {
          roles: ['admin', 'lider', 'especialista', 'gestor']
        },
        loadComponent: () =>
          import('./pages/reports/reports.component').then((m) => m.ReportsComponent)
      },
      {
        path: 'alerts',
        canActivate: [roleGuard],
        data: {
          roles: ['admin', 'lider', 'especialista', 'gestor']
        },
        loadComponent: () =>
          import('./pages/alerts/alerts.component').then((m) => m.AlertsComponent)
      },
      {
        path: 'users',
        canActivate: [roleGuard],
        data: {
          roles: ['admin']
        },
        loadComponent: () =>
          import('./pages/users/users.component').then((m) => m.UsersComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];