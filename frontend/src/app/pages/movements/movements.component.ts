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
        <p>Formulario optimizado para registrar entradas y salidas desde celular.</p>
      </div>
    </div>

    <div class="grid-2 align-start">
      <section class="card mobile-form-card">
        <h2>Registrar movimiento</h2>
        <form class="form-grid" (ngSubmit)="submit()">
          <label>
            Código del artículo
            <div class="inline-input">
              <input name="item_code" [(ngModel)]="payload.item_code" required placeholder="Ej: MANT-0001" (blur)="previewItem()">
              <button type="button" class="ghost-btn" [disabled]="previewLoading || !canPreviewItem()" (click)="previewItem()">
                {{ previewLoading ? 'Buscando...' : 'Buscar' }}
              </button>
            </div>
          </label>

          <div class="preview-box" *ngIf="previewName">
            <strong>{{ previewName }}</strong>
            <span>Stock actual: {{ previewStock }}</span>
          </div>

          <label>
            Tipo de movimiento
            <select name="movement_type" [(ngModel)]="payload.movement_type" required>
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
            </select>
          </label>

          <label>
            Cantidad
            <input type="number" name="quantity" [(ngModel)]="payload.quantity" min="1" required>
          </label>

          <label>
            Motivo
            <input name="reason" [(ngModel)]="payload.reason" placeholder="Ej: Cambio habitación 203">
          </label>

          <label>
            Observación
            <textarea name="notes" [(ngModel)]="payload.notes" rows="3" placeholder="Detalle opcional"></textarea>
          </label>

          <p class="error" *ngIf="error">{{ error }}</p>
          <p class="success-text" *ngIf="success">{{ success }}</p>

          <button type="submit" class="primary-btn" [disabled]="saving || !canSubmitMovement()">
            {{ saving ? 'Registrando...' : 'Registrar movimiento' }}
          </button>
        </form>
      </section>

      <section class="card" *ngIf="showHistory">
        <div class="section-title">
          <h2>Historial reciente</h2>
          <button class="ghost-btn small" type="button" [disabled]="historyLoading" (click)="loadMovements()">
            {{ historyLoading ? 'Actualizando...' : 'Actualizar' }}
          </button>
        </div>
        <div *ngIf="movements.length === 0 && !historyLoading" class="empty">Sin movimientos registrados.</div>
        <div *ngIf="historyLoading" class="empty">Cargando movimientos...</div>
        <div *ngFor="let mov of movements" class="mini-row">
          <div>
            <strong>{{ mov.item_code }} · {{ mov.item_name }}</strong>
            <span>{{ mov.performed_by_name }} · {{ mov.created_at | date:'short' }}</span>
            <small>{{ mov.reason }}</small>
          </div>
          <span class="pill" [class.success]="mov.movement_type === 'entrada'" [class.danger]="mov.movement_type === 'salida'">
            {{ mov.movement_type }} {{ mov.quantity }}
          </span>
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
    this.error = '';
    this.previewName = '';
    this.previewStock = '';
    this.cdr.detectChanges();

    this.itemsService.getByCode(code)
      .pipe(
        finalize(() => {
          this.previewLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (item) => {
          this.payload.item_code = item.code;
          this.previewName = `${item.code} · ${item.name}`;
          this.previewStock = `${item.current_stock} ${item.unit}`;
        },
        error: (err) => {
          console.error('Error buscando artículo:', err);
          this.error = getHttpErrorMessage(err, 'No fue posible encontrar el artículo.');
        }
      });
  }

  submit(): void {
    if (this.saving || !this.canSubmitMovement()) {
      this.error = 'Completa código del artículo y cantidad válida.';
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
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.success = response.alert_sent
            ? 'Movimiento registrado. Se envió alerta de stock mínimo.'
            : 'Movimiento registrado correctamente.';
          this.payload = this.emptyPayload();
          this.previewName = '';
          this.previewStock = '';
          if (this.showHistory) this.loadMovements();
        },
        error: (err) => {
          console.error('Error registrando movimiento:', err);
          this.error = getHttpErrorMessage(err, 'No fue posible registrar el movimiento.');
        }
      });
  }

  loadMovements(): void {
    if (this.historyLoading) return;

    this.historyLoading = true;
    this.cdr.detectChanges();

    this.movementsService.list(100)
      .pipe(
        finalize(() => {
          this.historyLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (movements) => {
          this.movements = movements;
        },
        error: (err) => {
          console.error('Error cargando movimientos:', err);
          this.error = getHttpErrorMessage(err, 'No fue posible cargar los movimientos.');
        }
      });
  }

  private emptyPayload(): MovementPayload {
    return {
      item_code: '',
      item_id: null,
      movement_type: 'salida',
      quantity: 1,
      reason: '',
      notes: ''
    };
  }
}
