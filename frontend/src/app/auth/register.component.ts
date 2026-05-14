import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { getHttpErrorMessage } from '../core/http-error';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="auth-page">
      <section class="auth-card wide">
        <div class="brand-mark">IM</div>
        <h1>Crear cuenta</h1>
        <p class="muted">El primer usuario creado en la base de datos quedará como administrador.</p>

        <form (ngSubmit)="submit()" class="form-grid">
          <label>
            Nombre completo
            <input name="full_name" [(ngModel)]="fullName" required minlength="2" placeholder="Nombre y apellido">
          </label>

          <label>
            Correo electrónico
            <input type="email" name="email" [(ngModel)]="email" required placeholder="usuario@empresa.com">
          </label>

          <label>
            Contraseña
            <input type="password" name="password" [(ngModel)]="password" required minlength="8" placeholder="Mínimo 8 caracteres">
          </label>

          <p class="error" *ngIf="error">{{ error }}</p>
          <button type="submit" class="primary-btn" [disabled]="loading || !canRegister()">
            {{ loading ? 'Creando...' : 'Crear cuenta' }}
          </button>
        </form>

        <p class="auth-footer"><a routerLink="/login">Volver al login</a></p>
      </section>
    </main>
  `
})
export class RegisterComponent {
  fullName = '';
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  canRegister(): boolean {
    return (
      this.fullName.trim().length >= 2 &&
      this.email.trim().includes('@') &&
      this.email.trim().includes('.') &&
      this.password.length >= 8
    );
  }

  submit(): void {
    if (this.loading || !this.canRegister()) {
      this.error = 'Completa todos los campos correctamente. La contraseña debe tener mínimo 8 caracteres.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.auth.register({
      full_name: this.fullName.trim(),
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
          console.error('Error registro:', err);
          this.error = getHttpErrorMessage(err, 'No fue posible crear la cuenta.');
        }
      });
  }
}
