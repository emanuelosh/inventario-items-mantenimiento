import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { RegisterRequest, Role, User } from '../../core/api.types';
import { getHttpErrorMessage } from '../../core/http-error';
import { ALL_ROLES, ROLE_LABELS } from '../../core/roles';
import { UsersService } from '../../core/users.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Usuarios</h1>
        <p>Gestiona cuentas y roles de acceso al sistema de inventario.</p>
      </div>
    </div>

    <div class="grid-2 align-start">
      <!-- Create user form -->
      <section class="card">
        <h2>Crear nuevo usuario</h2>

        <form class="form-grid" (ngSubmit)="create()">
          <label>
            Nombre completo *
            <input
              name="full_name"
              [(ngModel)]="newUser.full_name"
              required
              minlength="2"
              placeholder="Ej: María García"
            >
          </label>
          <label>
            Correo electrónico *
            <input
              type="email"
              name="email"
              [(ngModel)]="newUser.email"
              required
              placeholder="usuario@empresa.com"
            >
          </label>
          <label>
            Contraseña temporal *
            <input
              type="password"
              name="password"
              [(ngModel)]="newUser.password"
              required
              minlength="8"
              placeholder="Mínimo 8 caracteres"
            >
          </label>
          <label>
            Rol de acceso *
            <select name="role" [(ngModel)]="newUser.role" required>
              <option *ngFor="let role of roles" [value]="role">{{ roleLabel(role) }}</option>
            </select>
          </label>

          <div style="background:var(--gray-50); border-radius:var(--radius); padding:12px 14px; border:1px solid var(--border);">
            <p style="font-size:0.82rem; font-weight:600; color:var(--gray-700); margin:0 0 8px;">
              Permisos del rol seleccionado
            </p>
            <p style="font-size:0.8rem; color:var(--text-muted); margin:0; line-height:1.5;">
              {{ roleDescription(newUser.role ?? 'colaborador') }}
            </p>
          </div>

          <label class="check-row">
            <input type="checkbox" name="send_email" [(ngModel)]="newUser.send_welcome_email">
            Enviar correo de bienvenida con credenciales
          </label>

          <p class="error" *ngIf="error">{{ error }}</p>
          <p class="success-text" *ngIf="success">{{ success }}</p>

          <button type="submit" class="primary-btn" [disabled]="saving || !canCreateUser()" style="margin-top:4px;">
            <span *ngIf="saving" class="spinner"></span>
            {{ saving ? 'Creando cuenta...' : 'Crear usuario' }}
          </button>
        </form>
      </section>

      <!-- Users list -->
      <section class="card">
        <div class="section-title">
          <h2>Usuarios del sistema ({{ users.length }})</h2>
          <button class="ghost-btn small" type="button" [disabled]="loadingUsers" (click)="load()">
            <span *ngIf="loadingUsers" class="spinner"></span>
            {{ loadingUsers ? '' : 'Actualizar' }}
          </button>
        </div>

        <div *ngIf="loadingUsers && users.length === 0" class="empty">
          <span class="spinner"></span>
        </div>

        <div *ngIf="!loadingUsers && users.length === 0" class="empty">
          <span class="empty-icon">⊛</span>
          No hay usuarios registrados.
        </div>

        <div *ngFor="let user of users" class="user-card">
          <div class="user-card-avatar">{{ userInitials(user) }}</div>
          <div class="user-card-info">
            <span class="user-card-name">{{ user.full_name }}</span>
            <span class="user-card-meta">{{ user.email }}</span>
            <div style="display:flex; gap:6px; margin-top:5px; flex-wrap:wrap;">
              <span class="pill" style="font-size:0.72rem; padding:2px 8px;">{{ roleLabel(user.role) }}</span>
              <span class="pill" [class.success]="user.is_active" [class.danger]="!user.is_active" style="font-size:0.72rem; padding:2px 8px;">
                {{ user.is_active ? 'Activo' : 'Inactivo' }}
              </span>
              <span class="pill info" style="font-size:0.72rem; padding:2px 8px;">
                {{ user.created_at | date:'dd/MM/yy' }}
              </span>
            </div>
          </div>
          <div class="user-card-actions">
            <button
              class="danger-btn small"
              type="button"
              [disabled]="!user.is_active || deactivatingUserId === user.id"
              (click)="deactivate(user)"
              title="Desactivar usuario"
            >
              {{ deactivatingUserId === user.id ? '...' : 'Desactivar' }}
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- Role reference -->
    <section class="card" style="margin-top:18px;">
      <div class="section-title">
        <h2>Referencia de roles</h2>
      </div>
      <div class="grid-3">
        <div *ngFor="let role of roles" style="background:var(--gray-50); border-radius:var(--radius); padding:14px; border:1px solid var(--border);">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <span class="pill" style="font-size:0.78rem;">{{ roleLabel(role) }}</span>
          </div>
          <p style="font-size:0.8rem; color:var(--text-secondary); margin:0; line-height:1.5;">{{ roleDescription(role) }}</p>
        </div>
      </div>
    </section>
  `
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  roles = ALL_ROLES;
  saving = false;
  loadingUsers = false;
  deactivatingUserId = '';
  error = '';
  success = '';
  newUser: RegisterRequest = this.emptyUser();

  constructor(
    private readonly usersService: UsersService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    if (this.loadingUsers) return;
    this.loadingUsers = true;
    this.error = '';
    this.cdr.detectChanges();

    this.usersService.list()
      .pipe(finalize(() => { this.loadingUsers = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (users) => { this.users = users; },
        error: (err) => { this.error = getHttpErrorMessage(err, 'No fue posible cargar los usuarios.'); }
      });
  }

  userInitials(user: User): string {
    return user.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  }

  canCreateUser(): boolean {
    const fn = this.newUser.full_name?.trim() ?? '';
    const em = this.newUser.email?.trim() ?? '';
    const pw = this.newUser.password ?? '';
    return fn.length >= 2 && em.includes('@') && em.includes('.') && pw.length >= 8 && !!this.newUser.role;
  }

  create(): void {
    if (this.saving || !this.canCreateUser()) {
      this.error = 'Completa todos los campos. La contraseña debe tener mínimo 8 caracteres.';
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';
    this.cdr.detectChanges();

    const payload: RegisterRequest = {
      ...this.newUser,
      full_name: this.newUser.full_name.trim(),
      email: this.newUser.email.trim().toLowerCase(),
      send_welcome_email: !!this.newUser.send_welcome_email
    };

    this.usersService.create(payload)
      .pipe(finalize(() => { this.saving = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: () => {
          this.success = `Usuario "${payload.full_name}" creado correctamente.`;
          this.newUser = this.emptyUser();
          this.load();
        },
        error: (err) => { this.error = getHttpErrorMessage(err, 'No fue posible crear el usuario.'); }
      });
  }

  deactivate(user: User): void {
    if (!confirm(`¿Desactivar la cuenta de ${user.full_name}? El usuario no podrá iniciar sesión.`)) return;

    this.deactivatingUserId = user.id;
    this.error = '';
    this.success = '';
    this.cdr.detectChanges();

    this.usersService.deactivate(user.id)
      .pipe(finalize(() => { this.deactivatingUserId = ''; this.cdr.detectChanges(); }))
      .subscribe({
        next: () => {
          this.success = `Cuenta de ${user.full_name} desactivada.`;
          this.load();
        },
        error: (err) => { this.error = getHttpErrorMessage(err, 'No fue posible desactivar el usuario.'); }
      });
  }

  roleLabel(role: Role): string {
    return ROLE_LABELS[role];
  }

  roleDescription(role: Role | string): string {
    const desc: Record<string, string> = {
      admin: 'Acceso completo. Crea usuarios, exporta reportes, gestiona todo el inventario y visualiza alertas.',
      lider: 'Gestiona inventario, registra movimientos, ve reportes y alertas. No puede crear usuarios.',
      especialista: 'Gestiona artículos y movimientos. Ve reportes y alertas de stock.',
      gestor: 'Registra movimientos y visualiza reportes. No puede editar artículos.',
      colaborador: 'Solo puede registrar movimientos de salida. Acceso mínimo de operación.'
    };
    return desc[role] ?? '';
  }

  private emptyUser(): RegisterRequest {
    return { full_name: '', email: '', password: '', role: 'colaborador', is_active: true, send_welcome_email: false };
  }
}
