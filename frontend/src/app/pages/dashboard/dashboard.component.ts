import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { InventoryItem, InventoryMovement } from '../../core/api.types';
import { AlertsService } from '../../core/alerts.service';
import { ItemsService } from '../../core/items.service';
import { MovementsService } from '../../core/movements.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p>Resumen operativo en tiempo real del inventario de mantenimiento.</p>
      </div>
      <div class="page-header-actions">
        <a class="primary-btn compact" routerLink="/movements">+ Registrar movimiento</a>
        <a class="ghost-btn compact" routerLink="/inventory">Ver inventario</a>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="stats-grid">
      <article class="stat-card" [class.warning]="lowItems.length > 0">
        <div class="stat-card-icon">📦</div>
        <span class="stat-card-label">Total artículos</span>
        <span class="stat-card-value">{{ items.length }}</span>
        <span class="stat-card-sub">{{ activeItems }} activos</span>
      </article>

      <article class="stat-card" [class.danger]="lowItems.length > 0" [class.success]="lowItems.length === 0">
        <div class="stat-card-icon">⚠️</div>
        <span class="stat-card-label">Stock mínimo</span>
        <span class="stat-card-value">{{ lowItems.length }}</span>
        <span class="stat-card-sub">{{ lowItems.length === 0 ? 'Todo en orden' : 'requieren atención' }}</span>
      </article>

      <article class="stat-card success">
        <div class="stat-card-icon">↑</div>
        <span class="stat-card-label">Entradas ({{ periodLabel }})</span>
        <span class="stat-card-value">{{ movementCount('entrada') }}</span>
        <span class="stat-card-sub">+{{ entradaQty }} unidades totales</span>
      </article>

      <article class="stat-card info">
        <div class="stat-card-icon">↓</div>
        <span class="stat-card-label">Salidas ({{ periodLabel }})</span>
        <span class="stat-card-value">{{ movementCount('salida') }}</span>
        <span class="stat-card-sub">-{{ salidaQty }} unidades totales</span>
      </article>
    </div>

    <div class="grid-2">
      <!-- Low stock items -->
      <section class="card">
        <div class="section-title">
          <h2>⚠ Artículos en stock mínimo</h2>
          <a class="ghost-btn small" routerLink="/inventory" [queryParams]="{status: 'low'}">Ver todos</a>
        </div>

        <div *ngIf="loading" class="empty">
          <span class="spinner"></span>
        </div>

        <div *ngIf="!loading && lowItems.length === 0" class="empty">
          <span class="empty-icon">✓</span>
          Todo el inventario está por encima del stock mínimo.
        </div>

        <div *ngFor="let item of lowItems.slice(0, 6)" class="mini-row danger-left">
          <div>
            <strong>{{ item.name }}</strong>
            <span>{{ item.code }} · {{ item.unit }}</span>
          </div>
          <div style="text-align:right;">
            <span class="pill danger">{{ item.current_stock }} / mín {{ item.min_stock }}</span>
          </div>
        </div>

        <div *ngIf="lowItems.length > 6" style="padding:10px 0 0; text-align:center;">
          <a class="ghost-btn small" routerLink="/inventory">
            + {{ lowItems.length - 6 }} más
          </a>
        </div>
      </section>

      <!-- Recent movements -->
      <section class="card">
        <div class="section-title">
          <h2>Últimos movimientos</h2>
          <a class="ghost-btn small" routerLink="/movements">Ver historial</a>
        </div>

        <div *ngIf="loading" class="empty">
          <span class="spinner"></span>
        </div>

        <div *ngIf="!loading && movements.length === 0" class="empty">
          <span class="empty-icon">⇄</span>
          Todavía no hay movimientos registrados.
        </div>

        <div *ngFor="let mov of movements.slice(0, 8)" class="mini-row">
          <div>
            <strong>{{ mov.item_name }}</strong>
            <span>{{ mov.item_code }} · {{ mov.performed_by_name }}</span>
            <small>{{ mov.created_at | date:'dd/MM/yy, HH:mm' }} · {{ mov.reason || 'Sin motivo' }}</small>
          </div>
          <span class="mov-type-badge" [class.entrada]="mov.movement_type === 'entrada'" [class.salida]="mov.movement_type === 'salida'">
            {{ mov.movement_type === 'entrada' ? '+' : '−' }}{{ mov.quantity }}
          </span>
        </div>
      </section>
    </div>

    <!-- Stock distribution bar -->
    <section class="card" *ngIf="!loading && items.length > 0" style="margin-top:18px;">
      <div class="section-title">
        <h2>Distribución de stock</h2>
        <span class="pill">{{ items.length }} artículos</span>
      </div>

      <div style="display:grid; grid-template-columns: repeat(3,1fr); gap:16px; margin-top:4px;">
        <div style="text-align:center; padding:14px; background:var(--red-50); border-radius:12px; border:1px solid var(--danger-border);">
          <span style="display:block; font-size:1.6rem; font-weight:800; color:var(--red-700); letter-spacing:-0.04em;">{{ lowItems.length }}</span>
          <span style="font-size:0.78rem; font-weight:700; color:var(--red-700); text-transform:uppercase; letter-spacing:0.04em;">Stock mínimo</span>
        </div>
        <div style="text-align:center; padding:14px; background:var(--teal-50); border-radius:12px; border:1px solid var(--success-border);">
          <span style="display:block; font-size:1.6rem; font-weight:800; color:var(--teal-700); letter-spacing:-0.04em;">{{ normalItems.length }}</span>
          <span style="font-size:0.78rem; font-weight:700; color:var(--teal-700); text-transform:uppercase; letter-spacing:0.04em;">Stock normal</span>
        </div>
        <div style="text-align:center; padding:14px; background:var(--amber-50); border-radius:12px; border:1px solid var(--warning-border);">
          <span style="display:block; font-size:1.6rem; font-weight:800; color:var(--amber-700); letter-spacing:-0.04em;">{{ highItems.length }}</span>
          <span style="font-size:0.78rem; font-weight:700; color:var(--amber-700); text-transform:uppercase; letter-spacing:0.04em;">Sobrestock</span>
        </div>
      </div>

      <div style="margin-top:14px; height:10px; border-radius:999px; overflow:hidden; display:flex; gap:2px;" *ngIf="items.length > 0">
        <div *ngIf="lowItems.length > 0" [style.flex]="lowItems.length" style="background:var(--red-600); border-radius:999px 0 0 999px; transition:flex 0.3s;"></div>
        <div *ngIf="normalItems.length > 0" [style.flex]="normalItems.length" style="background:var(--teal-600); transition:flex 0.3s;"></div>
        <div *ngIf="highItems.length > 0" [style.flex]="highItems.length" style="background:var(--amber-600); border-radius:0 999px 999px 0; transition:flex 0.3s;"></div>
      </div>
    </section>
  `
})
export class DashboardComponent implements OnInit {
  items: InventoryItem[] = [];
  movements: InventoryMovement[] = [];
  loading = true;
  readonly periodLabel = 'últimos 50';

  constructor(
    private readonly itemsService: ItemsService,
    private readonly movementsService: MovementsService
  ) {}

  ngOnInit(): void {
    forkJoin({
      items: this.itemsService.list(),
      movements: this.movementsService.list(50)
    }).subscribe({
      next: ({ items, movements }) => {
        this.items = items;
        this.movements = movements;
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  get lowItems(): InventoryItem[] {
    return this.items.filter((i) => i.stock_status === 'low');
  }

  get normalItems(): InventoryItem[] {
    return this.items.filter((i) => i.stock_status === 'ok');
  }

  get highItems(): InventoryItem[] {
    return this.items.filter((i) => i.stock_status === 'high');
  }

  get activeItems(): number {
    return this.items.filter((i) => i.is_active).length;
  }

  get entradaQty(): number {
    return this.movements.filter((m) => m.movement_type === 'entrada').reduce((s, m) => s + m.quantity, 0);
  }

  get salidaQty(): number {
    return this.movements.filter((m) => m.movement_type === 'salida').reduce((s, m) => s + m.quantity, 0);
  }

  movementCount(type: 'entrada' | 'salida'): number {
    return this.movements.filter((m) => m.movement_type === type).length;
  }
}
