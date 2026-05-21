import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { StockAlert } from '../../core/api.types';
import { AlertsService } from '../../core/alerts.service';
import { AuthService } from '../../core/auth.service';
import { getHttpErrorMessage } from '../../core/http-error';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Alertas de Stock</h1>
        <p>Historial de notificaciones de stock mínimo enviadas por correo.</p>
      </div>
      <div class="page-header-actions" *ngIf="isAdmin">
        <button class="ghost-btn compact" type="button" [disabled]="loadingAlerts" (click)="load()">
          Actualizar
        </button>
        <button class="primary-btn compact" type="button" [disabled]="testingEmail" (click)="testEmail()">
          <span *ngIf="testingEmail" class="spinner"></span>
          {{ testingEmail ? 'Enviando...' : 'Probar correo' }}
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="alert-stats" *ngIf="!loadingAlerts && alerts.length > 0">
      <div class="alert-stat">
        <span class="alert-stat-number" style="color:var(--gray-900);">{{ alerts.length }}</span>
        <span class="alert-stat-label">Total alertas</span>
      </div>
      <div class="alert-stat" style="border-color:var(--success-border); background:var(--teal-50);">
        <span class="alert-stat-number" style="color:var(--teal-700);">{{ countByStatus('sent') }}</span>
        <span class="alert-stat-label" style="color:var(--teal-700);">Enviadas</span>
      </div>
      <div class="alert-stat" style="border-color:var(--danger-border); background:var(--red-50);">
        <span class="alert-stat-number" style="color:var(--red-700);">{{ countByStatus('failed') }}</span>
        <span class="alert-stat-label" style="color:var(--red-700);">Con error</span>
      </div>
    </div>

    <p class="error" *ngIf="error" style="margin-bottom:14px;">{{ error }}</p>
    <p class="success-text" *ngIf="success" style="margin-bottom:14px;">{{ success }}</p>

    <!-- Email config notice for admin -->
    <div *ngIf="isAdmin" style="background:var(--blue-50); border:1px solid #93c5fd; border-radius:var(--radius); padding:14px 16px; margin-bottom:18px; display:flex; gap:12px; align-items:flex-start;">
      <span style="font-size:1.1rem; margin-top:1px;">ℹ</span>
      <div>
        <p style="font-weight:600; color:var(--blue-700); font-size:0.875rem; margin:0;">Configuración de correo</p>
        <p style="color:var(--blue-700); font-size:0.82rem; margin:4px 0 0;">
          Las alertas se envían automáticamente cuando un artículo cae por debajo del stock mínimo.
          Configura las variables <code style="background:rgba(0,0,0,0.06); padding:1px 5px; border-radius:4px;">SMTP_*</code> en el servidor para activar el envío de correos.
        </p>
      </div>
    </div>

    <section class="table-card">
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Artículo</th>
              <th>Stock actual</th>
              <th>Stock mínimo</th>
              <th>Destinatarios</th>
              <th>Estado</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let alert of alerts">
              <td style="white-space:nowrap; font-size:0.82rem; color:var(--text-muted);">
                {{ alert.created_at | date:'dd/MM/yy' }}<br>
                <small>{{ alert.created_at | date:'HH:mm' }}</small>
              </td>
              <td>
                <code style="font-size:0.8rem; background:var(--gray-100); padding:2px 6px; border-radius:6px;">{{ alert.item_code }}</code>
                <small style="display:block; margin-top:3px;">{{ alert.item_name }}</small>
              </td>
              <td>
                <span style="font-weight:700; color:var(--red-700);">{{ alert.current_stock }}</span>
              </td>
              <td style="color:var(--text-secondary);">{{ alert.min_stock }}</td>
              <td style="font-size:0.82rem; color:var(--text-secondary); max-width:200px; word-break:break-all;">{{ alert.sent_to || '—' }}</td>
              <td>
                <span class="pill" [class.success]="alert.status === 'sent'" [class.danger]="alert.status === 'failed'" [class.warning]="alert.status === 'disabled'">
                  {{ statusLabel(alert.status) }}
                </span>
              </td>
              <td style="font-size:0.8rem; color:var(--red-600); max-width:180px;">
                {{ alert.error_message || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="alerts.length === 0 && !loadingAlerts" class="empty">
        <span class="empty-icon">◉</span>
        No hay alertas registradas todavía.
        <p style="font-size:0.82rem; margin-top:8px;">Las alertas se crean automáticamente al registrar movimientos de salida que reducen el stock por debajo del mínimo.</p>
      </div>

      <div *ngIf="loadingAlerts" class="empty">
        <span class="spinner"></span>
      </div>
    </section>
  `
})
export class AlertsComponent implements OnInit {
  alerts: StockAlert[] = [];
  error = '';
  success = '';
  testingEmail = false;
  loadingAlerts = false;

  constructor(
    private readonly alertsService: AlertsService,
    private readonly auth: AuthService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.load(); }

  get isAdmin(): boolean {
    return this.auth.currentUser()?.role === 'admin';
  }

  countByStatus(status: string): number {
    return this.alerts.filter((a) => a.status === status).length;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = { sent: 'Enviado', failed: 'Error', disabled: 'Desactivado', pending: 'Pendiente' };
    return labels[status] ?? status;
  }

  load(): void {
    if (this.loadingAlerts) return;
    this.loadingAlerts = true;
    this.error = '';
    this.cdr.detectChanges();

    this.alertsService.list()
      .pipe(finalize(() => { this.loadingAlerts = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (alerts) => { this.alerts = alerts; },
        error: (err) => { this.error = getHttpErrorMessage(err, 'No fue posible cargar las alertas.'); }
      });
  }

  testEmail(): void {
    if (this.testingEmail) return;
    this.testingEmail = true;
    this.success = '';
    this.error = '';
    this.cdr.detectChanges();

    this.alertsService.testEmail()
      .pipe(finalize(() => { this.testingEmail = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (response) => {
          this.success = response.message;
          this.load();
        },
        error: (err) => {
          this.error = getHttpErrorMessage(err, 'No fue posible enviar correo de prueba. Verifica la configuración SMTP.');
        }
      });
  }
}
