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
  section: string;
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
          <div class="sidebar-brand-text">
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
            <span class="nav-icon">{{ item.icon }}</span>
            {{ item.label }}
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="user-chip">
            <div class="user-avatar">{{ userInitials() }}</div>
            <div class="user-chip-info">
              <span class="user-chip-name">{{ user()?.full_name }}</span>
              <span class="user-chip-role">{{ roleLabel(user()?.role) }}</span>
            </div>
            <button class="logout-btn" type="button" (click)="logout()" title="Cerrar sesión">✕</button>
          </div>
        </div>
      </aside>

      <!-- Mobile overlay -->
      <div class="sidebar-overlay" *ngIf="menuOpen" (click)="menuOpen = false"></div>

      <div class="main-area">
        <header class="topbar">
          <div class="topbar-left">
            <button class="icon-btn mobile-only" type="button" (click)="menuOpen = !menuOpen" aria-label="Menú">
              ☰
            </button>
            <div>
              <p class="topbar-title">Gestión de Inventario</p>
              <p class="topbar-subtitle">{{ user()?.full_name }} · {{ roleLabel(user()?.role) }}</p>
            </div>
          </div>

          <button class="ghost-btn" type="button" (click)="logout()">
            Salir
          </button>
        </header>

        <section class="content-wrap">
          <router-outlet />
        </section>
      </div>
    </div>
  `,
  styles: [`
    .sidebar-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 40;
      display: none;
    }
    @media (max-width: 980px) {
      .sidebar-overlay { display: block; }
    }
  `]
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.auth.currentUser;
  menuOpen = false;

  readonly navItems: NavItem[] = [
    { label: 'Dashboard',   path: '/dashboard',  icon: '◈',  roles: ['admin','lider','especialista','gestor','colaborador'], section: 'principal' },
    { label: 'Inventario',  path: '/inventory',  icon: '⊡',  roles: ['admin','lider','especialista','gestor','colaborador'], section: 'principal' },
    { label: 'Movimientos', path: '/movements',  icon: '⇄',  roles: ['admin','lider','especialista','gestor','colaborador'], section: 'principal' },
    { label: 'Reportes',    path: '/reports',    icon: '⊞',  roles: ['admin','lider','especialista','gestor'], section: 'gestion' },
    { label: 'Alertas',     path: '/alerts',     icon: '◉',  roles: ['admin','lider','especialista','gestor'], section: 'gestion' },
    { label: 'Usuarios',    path: '/users',      icon: '⊛',  roles: ['admin'], section: 'admin' },
  ];

  visibleNavItems(): NavItem[] {
    const currentUser = this.user();
    if (!currentUser?.role) return [];
    return this.navItems.filter((item) => item.roles.includes(currentUser.role));
  }

  userInitials(): string {
    const name = this.user()?.full_name ?? '';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  roleLabel(role?: Role): string {
    return role ? ROLE_LABELS[role] : '';
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
