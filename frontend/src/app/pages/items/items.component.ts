import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { InventoryItem, InventoryItemPayload, StockStatus } from '../../core/api.types';
import { getHttpErrorMessage } from '../../core/http-error';
import { ItemsService } from '../../core/items.service';
import { MANAGE_ITEM_ROLES, hasRole } from '../../core/roles';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Inventario</h1>
        <p>Administra artículos por código único con control de stock mínimo y máximo.</p>
      </div>
      <div class="page-header-actions">
        <button *ngIf="canManageItems" class="primary-btn compact" type="button" (click)="openCreate()">
          + Nuevo artículo
        </button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <input
        class="toolbar-search"
        placeholder="Buscar por código o nombre..."
        [(ngModel)]="search"
        (keyup.enter)="load()"
      >
      <select [(ngModel)]="statusFilter" (change)="load()" style="min-width:160px;">
        <option value="all">Todos los estados</option>
        <option value="low">Stock mínimo</option>
        <option value="ok">Stock normal</option>
        <option value="high">Sobrestock</option>
      </select>
      <button class="ghost-btn" type="button" [disabled]="loadingItems" (click)="load()">
        <span *ngIf="loadingItems" class="spinner"></span>
        {{ loadingItems ? '' : 'Buscar' }}
      </button>
    </div>

    <p class="error" *ngIf="error" style="margin-bottom:14px;">{{ error }}</p>

    <!-- Summary bar -->
    <div *ngIf="items.length > 0" style="display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap;">
      <span class="pill">{{ items.length }} artículos</span>
      <span class="pill danger" *ngIf="countByStatus('low') > 0">{{ countByStatus('low') }} en mínimo</span>
      <span class="pill warning" *ngIf="countByStatus('high') > 0">{{ countByStatus('high') }} sobrestock</span>
      <span class="pill success" *ngIf="countByStatus('ok') > 0">{{ countByStatus('ok') }} normales</span>
    </div>

    <section class="table-card">
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Artículo</th>
              <th>Unidad</th>
              <th>Stock</th>
              <th>Mín / Máx</th>
              <th>Estado</th>
              <th>Activo</th>
              <th *ngIf="canManageItems">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of items">
              <td><code style="font-size:0.82rem; background:var(--gray-100); padding:3px 7px; border-radius:6px; color:var(--gray-700);">{{ item.code }}</code></td>
              <td>
                <strong>{{ item.name }}</strong>
                <small *ngIf="item.description">{{ item.description }}</small>
              </td>
              <td style="color:var(--text-secondary); font-size:0.875rem;">{{ item.unit }}</td>
              <td>
                <span [style.font-weight]="'700'" [style.color]="stockColor(item)">
                  {{ item.current_stock }}
                </span>
              </td>
              <td style="color:var(--text-secondary); font-size:0.875rem;">{{ item.min_stock }} / {{ item.max_stock }}</td>
              <td><span class="pill" [ngClass]="statusClass(item.stock_status)">{{ statusLabel(item.stock_status) }}</span></td>
              <td>
                <span class="pill" [class.success]="item.is_active" [class.danger]="!item.is_active">
                  {{ item.is_active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td *ngIf="canManageItems" class="actions-cell">
                <button class="ghost-btn small" type="button" (click)="openEdit(item)">Editar</button>
                <button
                  class="danger-btn small"
                  type="button"
                  [disabled]="!item.is_active || deactivatingItemId === item.id"
                  (click)="deactivate(item)">
                  {{ deactivatingItemId === item.id ? '...' : 'Desactivar' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="items.length === 0 && !loadingItems" class="empty">
        <span class="empty-icon">📦</span>
        No hay artículos para mostrar.
        <span *ngIf="search || statusFilter !== 'all'" style="display:block; margin-top:8px;">
          <button class="ghost-btn small" type="button" (click)="clearFilters()">Limpiar filtros</button>
        </span>
      </div>

      <div *ngIf="loadingItems" class="empty">
        <span class="spinner"></span>
      </div>
    </section>

    <!-- Create / Edit Modal -->
    <div class="modal-backdrop" *ngIf="showForm" (click)="onBackdropClick($event)">
      <section class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ editingItem ? 'Editar artículo' : 'Nuevo artículo' }}</h2>
          <button class="icon-btn" type="button" [disabled]="saving" (click)="closeForm()">✕</button>
        </div>

        <form class="form-grid two" (ngSubmit)="save()">
          <label>
            Código único *
            <input name="code" [(ngModel)]="formModel.code" required minlength="2" placeholder="Ej: MANT-0001" [disabled]="!!editingItem">
          </label>
          <label>
            Nombre del artículo *
            <input name="name" [(ngModel)]="formModel.name" required minlength="2" placeholder="Ej: Bombillo LED 9W">
          </label>
          <label>
            Unidad de medida *
            <input name="unit" [(ngModel)]="formModel.unit" required placeholder="Ej: unidad, caja, litro">
          </label>
          <label>
            Stock actual *
            <input type="number" name="current_stock" [(ngModel)]="formModel.current_stock" min="0" required>
          </label>
          <label>
            Stock mínimo *
            <input type="number" name="min_stock" [(ngModel)]="formModel.min_stock" min="0" required>
          </label>
          <label>
            Stock máximo *
            <input type="number" name="max_stock" [(ngModel)]="formModel.max_stock" min="0" required>
          </label>
          <label class="span-2">
            Descripción
            <textarea name="description" [(ngModel)]="formModel.description" rows="2" placeholder="Descripción o ubicación del artículo (opcional)"></textarea>
          </label>
          <label class="check-row span-2">
            <input type="checkbox" name="is_active" [(ngModel)]="formModel.is_active">
            Artículo activo en el sistema
          </label>

          <p class="error span-2" *ngIf="formError">{{ formError }}</p>

          <div class="span-2" style="display:flex; gap:10px; justify-content:flex-end; margin-top:4px;">
            <button type="button" class="ghost-btn" [disabled]="saving" (click)="closeForm()">Cancelar</button>
            <button type="submit" class="primary-btn" [disabled]="saving || !canSaveItem()">
              <span *ngIf="saving" class="spinner"></span>
              {{ saving ? 'Guardando...' : (editingItem ? 'Guardar cambios' : 'Crear artículo') }}
            </button>
          </div>
        </form>
      </section>
    </div>
  `
})
export class ItemsComponent implements OnInit {
  items: InventoryItem[] = [];
  search = '';
  statusFilter: StockStatus | 'all' = 'all';
  error = '';
  showForm = false;
  saving = false;
  loadingItems = false;
  deactivatingItemId = '';
  formError = '';
  editingItem: InventoryItem | null = null;
  formModel: InventoryItemPayload = this.emptyForm();

  constructor(
    private readonly itemsService: ItemsService,
    private readonly auth: AuthService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.load(); }

  get canManageItems(): boolean {
    return hasRole(this.auth.currentUser()?.role, MANAGE_ITEM_ROLES);
  }

  countByStatus(status: StockStatus): number {
    return this.items.filter((i) => i.stock_status === status).length;
  }

  stockColor(item: InventoryItem): string {
    if (item.stock_status === 'low') return 'var(--red-700)';
    if (item.stock_status === 'high') return 'var(--amber-700)';
    return 'var(--gray-800)';
  }

  clearFilters(): void {
    this.search = '';
    this.statusFilter = 'all';
    this.load();
  }

  load(): void {
    if (this.loadingItems) return;
    this.loadingItems = true;
    this.error = '';
    this.cdr.detectChanges();

    this.itemsService.list(this.search, this.statusFilter)
      .pipe(finalize(() => { this.loadingItems = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (items) => { this.items = items; },
        error: (err) => { this.error = getHttpErrorMessage(err, 'No fue posible cargar el inventario.'); }
      });
  }

  openCreate(): void {
    this.editingItem = null;
    this.formModel = this.emptyForm();
    this.formError = '';
    this.showForm = true;
    this.cdr.detectChanges();
  }

  openEdit(item: InventoryItem): void {
    this.editingItem = item;
    this.formModel = {
      code: item.code,
      name: item.name,
      description: item.description,
      unit: item.unit,
      current_stock: item.current_stock,
      min_stock: item.min_stock,
      max_stock: item.max_stock,
      is_active: item.is_active
    };
    this.formError = '';
    this.showForm = true;
    this.cdr.detectChanges();
  }

  closeForm(): void {
    if (this.saving) return;
    this.showForm = false;
    this.formError = '';
    this.cdr.detectChanges();
  }

  onBackdropClick(event: MouseEvent): void {
    if (!this.saving) this.closeForm();
  }

  canSaveItem(): boolean {
    return (
      this.formModel.code.trim().length >= 2 &&
      this.formModel.name.trim().length >= 2 &&
      this.formModel.unit.trim().length > 0 &&
      Number(this.formModel.current_stock) >= 0 &&
      Number(this.formModel.min_stock) >= 0 &&
      Number(this.formModel.max_stock) >= 0
    );
  }

  save(): void {
    if (this.saving || !this.canSaveItem()) {
      this.formError = 'Completa los campos obligatorios correctamente.';
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.formError = '';
    this.cdr.detectChanges();

    const payload: InventoryItemPayload = {
      ...this.formModel,
      code: this.formModel.code.trim().toUpperCase(),
      name: this.formModel.name.trim(),
      unit: this.formModel.unit.trim(),
      description: this.formModel.description?.trim() ?? '',
      current_stock: Number(this.formModel.current_stock),
      min_stock: Number(this.formModel.min_stock),
      max_stock: Number(this.formModel.max_stock)
    };

    const request = this.editingItem
      ? this.itemsService.update(this.editingItem.id, payload)
      : this.itemsService.create(payload);

    request
      .pipe(finalize(() => { this.saving = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: () => { this.showForm = false; this.load(); },
        error: (err) => { this.formError = getHttpErrorMessage(err, 'No fue posible guardar el artículo.'); }
      });
  }

  deactivate(item: InventoryItem): void {
    if (!confirm(`¿Desactivar el artículo "${item.name}" (${item.code})?`)) return;

    this.deactivatingItemId = item.id;
    this.error = '';
    this.cdr.detectChanges();

    this.itemsService.deactivate(item.id)
      .pipe(finalize(() => { this.deactivatingItemId = ''; this.cdr.detectChanges(); }))
      .subscribe({
        next: () => this.load(),
        error: (err) => { this.error = getHttpErrorMessage(err, 'No fue posible desactivar el artículo.'); }
      });
  }

  statusLabel(status: StockStatus): string {
    const labels: Record<StockStatus, string> = { low: 'Mínimo', ok: 'Normal', high: 'Sobrestock' };
    return labels[status];
  }

  statusClass(status: StockStatus): string {
    return status === 'low' ? 'danger' : status === 'high' ? 'warning' : 'success';
  }

  private emptyForm(): InventoryItemPayload {
    return { code: '', name: '', description: '', unit: 'unidad', current_stock: 0, min_stock: 0, max_stock: 0, is_active: true };
  }
}
