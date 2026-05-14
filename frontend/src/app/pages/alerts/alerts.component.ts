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
        <h1>Alertas</h1>
        <p>Historial de alertas de stock mínimo enviadas por correo.</p>
      </div>
      <button *ngIf="isAdmin" class="primary-btn compact" type="button" [disabled]="testingEmail" (click)="testEmail()">
        {{ testingEmail ? 'Probando...' : 'Probar correo' }}
      </button>
    </div>

    <p class="error" *ngIf="error">{{ error }}</p>
    <p class="success-text" *ngIf="success">{{ success }}</p>

    <section class="table-card">
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Artículo</th>
              <th>Stock</th>
              <th>Destinatarios</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let alert of alerts">
              <td>{{ alert.created_at | date:'short' }}</td>
              <td><strong>{{ alert.item_code }}</strong><small>{{ alert.item_name }}</small></td>
              <td>{{ alert.current_stock }} / mín {{ alert.min_stock }}</td>
              <td>{{ alert.sent_to }}</td>
              <td><span class="pill" [class.success]="alert.status === 'sent'" [class.danger]="alert.status === 'failed'">{{ alert.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div *ngIf="alerts.length === 0 && !loadingAlerts" class="empty">No hay alertas registradas.</div>
      <div *ngIf="loadingAlerts" class="empty">Cargando alertas...</div>
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

  ngOnInit(): void {
    this.load();
  }

  get isAdmin(): boolean {
    return this.auth.currentUser()?.role === 'admin';
  }

  load(): void {
    if (this.loadingAlerts) return;

    this.loadingAlerts = true;
    this.error = '';
    this.cdr.detectChanges();

    this.alertsService.list()
      .pipe(
        finalize(() => {
          this.loadingAlerts = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (alerts) => {
          this.alerts = alerts;
        },
        error: (err) => {
          console.error('Error cargando alertas:', err);
          this.error = getHttpErrorMessage(err, 'No fue posible cargar las alertas.');
        }
      });
  }

  testEmail(): void {
    if (this.testingEmail) return;

    this.testingEmail = true;
    this.success = '';
    this.error = '';
    this.cdr.detectChanges();

    this.alertsService.testEmail()
      .pipe(
        finalize(() => {
          this.testingEmail = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.success = response.message;
          this.load();
        },
        error: (err) => {
          console.error('Error probando correo:', err);
          this.error = getHttpErrorMessage(err, 'No fue posible enviar correo de prueba.');
        }
      });
  }
}
