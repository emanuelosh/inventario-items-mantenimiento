import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { InventoryMovement, MovementPayload } from '../../core/api.types';
import { getHttpErrorMessage } from '../../core/http-error';
import { ItemsService } from '../../core/items.service';
import { MovementsService } from '../../core/movements.service';

@Component({
  selector: 'app-movements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Movimientos</h1>
        <p>Registra entradas y salidas de artículos. Optimizado para uso desde celular.</p>
      </div>
    </div>

    <div class="grid-2 align-start">
      <!-- Form -->
      <section class="card">
        <h2 style="margin-bottom:18px;">Registrar movimiento</h2>

        <form class="form-grid" (ngSubmit)="submit()">
          <!-- Item code lookup -->
          <label>
            Código del artículo
            <div class="inline-input">
              <input
                name="item_code"
                [(ngModel)]="payload.item_code"
                required
                placeholder="Ej: MANT-0001"
                (blur)="previewItem()"
                style="text-transform:uppercase;"
              >
              <button
                type="button"
                class="ghost-btn"
                [disabled]="previewLoading || !canPreviewItem()"
                (click)="previewItem()"
              >
                <span *ngIf="previewLoading" class="spinner"></span>
                {{ previewLoading ? '' : 'Buscar' }}
              </button>
            </div>
          </label>

          <!-- Preview -->
          <div class="preview-box" *ngIf="previewName">
            <strong>{{ previewName }}</strong>
            <span>Stock actual: {{ previewStock }}</span>
          </div>

          <div class="error" *ngIf="previewError" style="margin:0;">{{ previewError }}</div>

          <!-- Type selector -->
          <label>Tipo de movimiento</label>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:-8px;">
            <button
              type="button"
              [class]="payload.movement_type === 'entrada' ? 'success-btn' : 'ghost-btn'"
              (click)="payload.movement_type = 'entrada'"
              style="padding:12px; border-radius:12px; font-size:0.95rem;"
            >
              ↑ Entrada
            </button>
            <button
              type="button"
              [class]="payload.movement_type === 'salida' ? 'danger-btn' : 'ghost-btn'"
              (click)="payload.movement_type = 'salida'"
              style="padding:12px; border-radius:12px; font-size:0.95rem;"
            >
              ↓ Salida
            </button>
          </div>

          <label>
            Cantidad *
            <input type="number" name="quantity" [(ngModel)]="payload.quantity" min="1" required>
          </label>

          <label>
            Motivo
            <input name="reason" [(ngModel)]="payload.reason" placeholder="Ej: Cambio habitación 203, Reposición mensual">
          </label>

          <label>
            Observación
            <textarea name="notes" [(ngModel)]="payload.notes" rows="2" placeholder="Detalles adicionales (opcional)"></textarea>
          </label>

          <p class="error" *ngIf="error">{{ error }}</p>
          <p class="success-text" *ngIf="success">{{ success }}</p>

          <button
            type="submit"
            [class]="payload.movement_type === 'entrada' ? 'success-btn' : 'primary-btn'"
            [disabled]="saving || !canSubmitMovement()"
            style="margin-top:4px;"
          >
            <span *ngIf="saving" class="spinner"></span>
            {{ saving ? 'Registrando...' : (payload.movement_type === 'entrada' ? '↑ Registrar entrada' : '↓ Registrar salida') }}
          </button>
        </form>
      </section>

      <!-- History -->
      <section class="card" *ngIf="showHistory">
        <div class="section-title">
          <h2>Historial reciente</h2>
          <button class="ghost-btn small" type="button" [disabled]="historyLoading" (click)="loadMovements()">
            <span *ngIf="historyLoading" class="spinner"></span>
            {{ historyLoading ? '' : 'Actualizar' }}
          </button>
        </div>

        <div *ngIf="movements.length === 0 && !historyLoading" class="empty">
          <span class="empty-icon">⇄</span>
          Sin movimientos registrados.
        </div>

        <div *ngIf="historyLoading" class="empty">
          <span class="spinner"></span>
        </div>

        <div *ngFor="let mov of movements" class="mini-row">
          <div style="min-width:0; flex:1;">
            <strong>{{ mov.item_name }}</strong>
            <span>{{ mov.item_code }} · {{ mov.performed_by_name }}</span>
            <small>{{ mov.created_at | date:'dd/MM/yy HH:mm' }}<span *ngIf="mov.reason"> · {{ mov.reason }}</span></small>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0;">
            <span class="mov-type-badge" [class.entrada]="mov.movement_type === 'entrada'" [class.salida]="mov.movement_type === 'salida'">
              {{ mov.movement_type === 'entrada' ? '+' : '−' }}{{ mov.quantity }}
            </span>
            <small style="font-size:0.72rem; color:var(--text-muted);">{{ mov.stock_before }} → {{ mov.stock_after }}</small>
          </div>
        </div>
      </section>

      <!-- Collaborator note -->
      <section class="card" *ngIf="!showHistory" style="background:var(--gray-50);">
        <div style="text-align:center; padding:20px 0;">
          <span style="font-size:2rem; display:block; margin-bottom:10px;">⇄</span>
          <p style="font-weight:600; color:var(--gray-700);">Registra un movimiento usando el formulario.</p>
          <p style="font-size:0.875rem; color:var(--text-muted); margin-top:6px;">El historial solo está disponible para supervisores.</p>
        </div>
      </section>
    </div>
  `
})
export class MovementsComponent implements OnInit {
  payload: MovementPayload = this.emptyPayload();
  movements: InventoryMovement[] = [];
  saving = false;
  previewLoading = false;
  historyLoading = false;
  error = '';
  success = '';
  previewError = '';
  previewName = '';
  previewStock = '';

  constructor(
    private readonly movementsService: MovementsService,
    private readonly itemsService: ItemsService,
    private readonly auth: AuthService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.showHistory) this.loadMovements();
  }

  get showHistory(): boolean {
    return this.auth.currentUser()?.role !== 'colaborador';
  }

  canPreviewItem(): boolean {
    return (this.payload.item_code?.trim().length ?? 0) >= 2;
  }

  canSubmitMovement(): boolean {
    return (
      (this.payload.item_code?.trim().length ?? 0) >= 2 &&
      Number(this.payload.quantity) >= 1 &&
      !!this.payload.movement_type
    );
  }

  previewItem(): void {
    const code = this.payload.item_code?.trim().toUpperCase();
    if (!code || this.previewLoading) return;

    this.previewLoading = true;
    this.previewError = '';
    this.previewName = '';
    this.previewStock = '';
    this.cdr.detectChanges();

    this.itemsService.getByCode(code)
      .pipe(finalize(() => { this.previewLoading = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (item) => {
          this.payload.item_code = item.code;
          this.previewName = `${item.code} · ${item.name}`;
          this.previewStock = `${item.current_stock} ${item.unit}`;
        },
        error: (err) => {
          this.previewError = getHttpErrorMessage(err, 'Artículo no encontrado. Verifica el código.');
        }
      });
  }

  submit(): void {
    if (this.saving || !this.canSubmitMovement()) {
      this.error = 'Completa el código del artículo y la cantidad.';
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';
    this.cdr.detectChanges();

    const cleanPayload: MovementPayload = {
      ...this.payload,
      item_code: this.payload.item_code?.trim().toUpperCase(),
      item_id: null,
      quantity: Number(this.payload.quantity),
      reason: this.payload.reason?.trim() ?? '',
      notes: this.payload.notes?.trim() ?? ''
    };

    this.movementsService.create(cleanPayload)
      .pipe(finalize(() => { this.saving = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (response) => {
          this.success = response.alert_sent
            ? '¡Movimiento registrado! Se envió alerta de stock mínimo por correo.'
            : 'Movimiento registrado correctamente.';
          this.payload = this.emptyPayload();
          this.previewName = '';
          this.previewStock = '';
          this.previewError = '';
          if (this.showHistory) this.loadMovements();
        },
        error: (err) => {
          this.error = getHttpErrorMessage(err, 'No fue posible registrar el movimiento.');
        }
      });
  }

  loadMovements(): void {
    if (this.historyLoading) return;
    this.historyLoading = true;
    this.cdr.detectChanges();

    this.movementsService.list(100)
      .pipe(finalize(() => { this.historyLoading = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (movements) => { this.movements = movements; },
        error: (err) => { this.error = getHttpErrorMessage(err, 'No fue posible cargar los movimientos.'); }
      });
  }

  private emptyPayload(): MovementPayload {
    return { item_code: '', item_id: null, movement_type: 'salida', quantity: 1, reason: '', notes: '' };
  }
}
