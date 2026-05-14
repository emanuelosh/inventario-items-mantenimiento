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
        <p>Crea cuentas y asigna roles para el sistema.</p>
      </div>
    </div>

    <div class="grid-2 align-start">
      <section class="card">
        <h2>Crear usuario</h2>
        <form class="form-grid" (ngSubmit)="create()">
          <label>Nombre completo
            <input name="full_name" [(ngModel)]="newUser.full_name" required minlength="2">
          </label>
          <label>Correo
            <input type="email" name="email" [(ngModel)]="newUser.email" required>
          </label>
          <label>Contraseña temporal
            <input type="password" name="password" [(ngModel)]="newUser.password" required minlength="8">
          </label>
          <label>Rol
            <select name="role" [(ngModel)]="newUser.role" required>
              <option *ngFor="let role of roles" [value]="role">{{ roleLabel(role) }}</option>
            </select>
          </label>
          <label class="check-row">
            <input type="checkbox" name="send_email" [(ngModel)]="newUser.send_welcome_email">
            Enviar correo de bienvenida
          </label>
          <p class="error" *ngIf="error">{{ error }}</p>
          <p class="success-text" *ngIf="success">{{ success }}</p>
          <button type="submit" class="primary-btn" [disabled]="saving || !canCreateUser()">
            {{ saving ? 'Creando...' : 'Crear usuario' }}
          </button>
        </form>
      </section>

      <section class="card">
        <div class="section-title">
          <h2>Usuarios registrados</h2>
          <button class="ghost-btn small" type="button" [disabled]="loadingUsers" (click)="load()">
            {{ loadingUsers ? 'Actualizando...' : 'Actualizar' }}
          </button>
        </div>
        <div *ngFor="let user of users" class="mini-row">
          <div>
            <strong>{{ user.full_name }}</strong>
            <span>{{ user.email }}</span>
            <small>{{ roleLabel(user.role) }} · {{ user.is_active ? 'Activo' : 'Inactivo' }}</small>
          </div>
          <button
            class="danger-btn small"
            type="button"
            [disabled]="!user.is_active || deactivatingUserId === user.id"
            (click)="deactivate(user)">
            {{ deactivatingUserId === user.id ? 'Desactivando...' : 'Desactivar' }}
          </button>
        </div>
      </section>
    </div>
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

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (this.loadingUsers) return;

    this.loadingUsers = true;
    this.error = '';
    this.cdr.detectChanges();

    this.usersService.list()
      .pipe(
        finalize(() => {
          this.loadingUsers = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (users) => {
          this.users = users;
        },
        error: (err) => {
          console.error('Error cargando usuarios:', err);
          this.error = getHttpErrorMessage(err, 'No fue posible cargar los usuarios.');
        }
      });
  }

  canCreateUser(): boolean {
    const fullName = this.newUser.full_name?.trim() ?? '';
    const email = this.newUser.email?.trim() ?? '';
    const password = this.newUser.password ?? '';
    const role = this.newUser.role;

    return (
      fullName.length >= 2 &&
      email.includes('@') &&
      email.includes('.') &&
      password.length >= 8 &&
      !!role
    );
  }

  create(): void {
    if (this.saving || !this.canCreateUser()) {
      this.error = 'Completa todos los campos correctamente. La contraseña debe tener mínimo 8 caracteres.';
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
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.success = 'Usuario creado correctamente.';
          this.newUser = this.emptyUser();
          this.load();
        },
        error: (err) => {
          console.error('Error creando usuario:', err);
          this.error = getHttpErrorMessage(err, 'No fue posible crear el usuario.');
        }
      });
  }

  deactivate(user: User): void {
    if (!confirm(`¿Desactivar a ${user.full_name}?`)) return;

    this.deactivatingUserId = user.id;
    this.error = '';
    this.success = '';
    this.cdr.detectChanges();

    this.usersService.deactivate(user.id)
      .pipe(
        finalize(() => {
          this.deactivatingUserId = '';
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.success = 'Usuario desactivado correctamente.';
          this.load();
        },
        error: (err) => {
          console.error('Error desactivando usuario:', err);
          this.error = getHttpErrorMessage(err, 'No fue posible desactivar el usuario.');
        }
      });
  }

  roleLabel(role: Role): string {
    return ROLE_LABELS[role];
  }

  private emptyUser(): RegisterRequest {
    return {
      full_name: '',
      email: '',
      password: '',
      role: 'colaborador',
      is_active: true,
      send_welcome_email: false
    };
  }
}
