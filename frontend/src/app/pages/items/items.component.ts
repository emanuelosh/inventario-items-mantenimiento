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
        <p>Administra artículos por código único, stock máximo y mínimo.</p>
      </div>
      <button *ngIf="canManageItems" class="primary-btn compact" type="button" (click)="openCreate()">Nuevo artículo</button>
    </div>

    <section class="toolbar card flat">
      <input placeholder="Buscar por código o nombre" [(ngModel)]="search" (keyup.enter)="load()">
      <select [(ngModel)]="statusFilter" (change)="load()">
        <option value="all">Todos</option>
        <option value="low">Stock mínimo</option>
        <option value="ok">Stock normal</option>
        <option value="high">Sobrestock</option>
      </select>
      <button class="ghost-btn" type="button" [disabled]="loadingItems" (click)="load()">
        {{ loadingItems ? 'Buscando...' : 'Buscar' }}
      </button>
    </section>

    <p class="error" *ngIf="error">{{ error }}</p>

    <section class="table-card">
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Artículo</th>
              <th>Stock</th>
              <th>Mín/Máx</th>
              <th>Estado</th>
              <th>Activo</th>
              <th *ngIf="canManageItems">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of items">
              <td><strong>{{ item.code }}</strong></td>
              <td>
                {{ item.name }}
                <small>{{ item.description }}</small>
              </td>
              <td>{{ item.current_stock }} {{ item.unit }}</td>
              <td>{{ item.min_stock }} / {{ item.max_stock }}</td>
              <td><span class="pill" [ngClass]="statusClass(item.stock_status)">{{ statusLabel(item.stock_status) }}</span></td>
              <td>{{ item.is_active ? 'Sí' : 'No' }}</td>
              <td *ngIf="canManageItems" class="actions-cell">
                <button class="ghost-btn small" type="button" (click)="openEdit(item)">Editar</button>
                <button
                  class="danger-btn small"
                  type="button"
                  [disabled]="deactivatingItemId === item.id"
                  (click)="deactivate(item)">
                  {{ deactivatingItemId === item.id ? 'Desactivando...' : 'Desactivar' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div *ngIf="items.length === 0 && !loadingItems" class="empty">No hay artículos para mostrar.</div>
      <div *ngIf="loadingItems" class="empty">Cargando inventario...</div>
    </section>

    <div class="modal-backdrop" *ngIf="showForm">
      <section class="modal-card">
        <div class="section-title">
          <h2>{{ editingItem ? 'Editar artículo' : 'Nuevo artículo' }}</h2>
          <button class="icon-btn" type="button" [disabled]="saving" (click)="closeForm()">×</button>
        </div>
        <form class="form-grid two" (ngSubmit)="save()">
          <label>Código único
            <input name="code" [(ngModel)]="formModel.code" required minlength="2">
          </label>
          <label>Nombre
            <input name="name" [(ngModel)]="formModel.name" required minlength="2">
          </label>
          <label>Unidad
            <input name="unit" [(ngModel)]="formModel.unit" required>
          </label>
          <label>Stock actual
            <input type="number" name="current_stock" [(ngModel)]="formModel.current_stock" min="0" required>
          </label>
          <label>Stock mínimo
            <input type="number" name="min_stock" [(ngModel)]="formModel.min_stock" min="0" required>
          </label>
          <label>Stock máximo
            <input type="number" name="max_stock" [(ngModel)]="formModel.max_stock" min="0" required>
          </label>
          <label class="span-2">Descripción
            <textarea name="description" [(ngModel)]="formModel.description" rows="3"></textarea>
          </label>
          <label class="check-row span-2">
            <input type="checkbox" name="is_active" [(ngModel)]="formModel.is_active">
            Artículo activo
          </label>
          <p class="error span-2" *ngIf="formError">{{ formError }}</p>
          <button type="submit" class="primary-btn span-2" [disabled]="saving || !canSaveItem()">
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
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

  ngOnInit(): void {
    this.load();
  }

  get canManageItems(): boolean {
    return hasRole(this.auth.currentUser()?.role, MANAGE_ITEM_ROLES);
  }

  load(): void {
    if (this.loadingItems) return;

    this.loadingItems = true;
    this.error = '';
    this.cdr.detectChanges();

    this.itemsService.list(this.search, this.statusFilter)
      .pipe(
        finalize(() => {
          this.loadingItems = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (items) => {
          this.items = items;
        },
        error: (err) => {
          console.error('Error cargando inventario:', err);
          this.error = getHttpErrorMessage(err, 'No fue posible cargar el inventario.');
        }
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
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.showForm = false;
          this.load();
        },
        error: (err) => {
          console.error('Error guardando artículo:', err);
          this.formError = getHttpErrorMessage(err, 'No fue posible guardar el artículo.');
        }
      });
  }

  deactivate(item: InventoryItem): void {
    if (!confirm(`¿Desactivar ${item.code}?`)) return;

    this.deactivatingItemId = item.id;
    this.error = '';
    this.cdr.detectChanges();

    this.itemsService.deactivate(item.id)
      .pipe(
        finalize(() => {
          this.deactivatingItemId = '';
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => this.load(),
        error: (err) => {
          console.error('Error desactivando artículo:', err);
          this.error = getHttpErrorMessage(err, 'No fue posible desactivar el artículo.');
        }
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
    return {
      code: '',
      name: '',
      description: '',
      unit: 'unidad',
      current_stock: 0,
      min_stock: 0,
      max_stock: 0,
      is_active: true
    };
  }
}
