import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { getHttpErrorMessage } from '../core/http-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="auth-page">
      <section class="auth-card">
        <div class="brand-mark">IM</div>
        <h1>Inventario Mantenimiento</h1>
        <p class="muted">Ingresa para controlar artículos, movimientos y reportes.</p>

        <form (ngSubmit)="submit()" class="form-grid">
          <label>
            Correo electrónico
            <input type="email" name="email" [(ngModel)]="email" required placeholder="usuario@empresa.com">
          </label>

          <label>
            Contraseña
            <input type="password" name="password" [(ngModel)]="password" required placeholder="Tu contraseña">
          </label>

          <p class="error" *ngIf="error">{{ error }}</p>
          <button type="submit" class="primary-btn" [disabled]="loading || !canLogin()">
            {{ loading ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </form>

        <p class="auth-footer">¿Primer ingreso? <a routerLink="/register">Crear cuenta inicial</a></p>
      </section>
    </main>
  `
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  canLogin(): boolean {
    return this.email.trim().includes('@') && this.password.length > 0;
  }

  submit(): void {
    if (this.loading || !this.canLogin()) {
      this.error = 'Ingresa correo y contraseña.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.auth.login({
      email: this.email.trim().toLowerCase(),
      password: this.password
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => this.router.navigateByUrl('/dashboard'),
        error: (err) => {
          console.error('Error login:', err);
          this.error = getHttpErrorMessage(err, 'No fue posible iniciar sesión.');
        }
      });
  }
}
