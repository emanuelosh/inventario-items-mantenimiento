import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Role } from '../core/api.types';
import { ROLE_LABELS } from '../core/roles';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles: Role[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <aside class="sidebar" [class.open]="menuOpen">
        <div class="sidebar-brand">
          <div class="brand-mark small">IM</div>
          <div>
            <strong>Inventario</strong>
            <span>Mantenimiento</span>
          </div>
        </div>

        <nav class="nav-list">
          <a
            *ngFor="let item of visibleNavItems()"
            [routerLink]="item.path"
            routerLinkActive="active"
            (click)="menuOpen = false"
          >
            <span>{{ item.icon }}</span>
            {{ item.label }}
          </a>
        </nav>
      </aside>

      <div class="main-area">
        <header class="topbar">
          <button class="icon-btn mobile-only" type="button" (click)="menuOpen = !menuOpen">
            ☰
          </button>

          <div>
            <h2>Gestión de inventario</h2>
            <p>{{ user()?.full_name }} · {{ roleLabel(user()?.role) }}</p>
          </div>

          <button class="ghost-btn" type="button" (click)="logout()">Salir</button>
        </header>

        <section class="content-wrap">
          <router-outlet />
        </section>
      </div>
    </div>
  `
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.auth.currentUser;

  menuOpen = false;

  readonly navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: '📊',
      roles: ['admin', 'lider', 'especialista', 'gestor', 'colaborador']
    },
    {
      label: 'Inventario',
      path: '/inventory',
      icon: '📦',
      roles: ['admin', 'lider', 'especialista', 'gestor', 'colaborador']
    },
    {
      label: 'Movimientos',
      path: '/movements',
      icon: '🔁',
      roles: ['admin', 'lider', 'especialista', 'gestor', 'colaborador']
    },
    {
      label: 'Reportes',
      path: '/reports',
      icon: '📄',
      roles: ['admin', 'lider', 'especialista', 'gestor']
    },
    {
      label: 'Alertas',
      path: '/alerts',
      icon: '🔔',
      roles: ['admin', 'lider', 'especialista', 'gestor']
    },
    {
      label: 'Usuarios',
      path: '/users',
      icon: '👥',
      roles: ['admin']
    }
  ];

  visibleNavItems(): NavItem[] {
    const currentUser = this.user();

    if (!currentUser?.role) {
      return [];
    }

    return this.navItems.filter((item) => item.roles.includes(currentUser.role));
  }

  roleLabel(role?: Role): string {
    return role ? ROLE_LABELS[role] : '';
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}