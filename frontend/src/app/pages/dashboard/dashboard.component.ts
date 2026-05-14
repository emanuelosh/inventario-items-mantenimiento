import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { InventoryItem, InventoryMovement } from '../../core/api.types';
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
        <p>Resumen operativo del inventario de mantenimiento.</p>
      </div>
      <a class="primary-btn compact" routerLink="/movimientos">Registrar movimiento</a>
    </div>

    <div class="stats-grid">
      <article class="stat-card">
        <span>Total artículos</span>
        <strong>{{ items.length }}</strong>
      </article>
      <article class="stat-card warning">
        <span>Artículos en stock mínimo</span>
        <strong>{{ lowItems.length }}</strong>
      </article>
      <article class="stat-card">
        <span>Movimientos recientes</span>
        <strong>{{ movements.length }}</strong>
      </article>
      <article class="stat-card success">
        <span>Entradas</span>
        <strong>{{ movementCount('entrada') }}</strong>
      </article>
    </div>

    <div class="grid-2">
      <section class="card">
        <div class="section-title">
          <h2>Artículos en stock mínimo</h2>
        </div>
        <div *ngIf="lowItems.length === 0" class="empty">No hay artículos en stock mínimo.</div>
        <div *ngFor="let item of lowItems" class="mini-row danger-left">
          <div>
            <strong>{{ item.code }} · {{ item.name }}</strong>
            <span>Stock actual: {{ item.current_stock }} {{ item.unit }}</span>
          </div>
          <span class="pill danger">Mín: {{ item.min_stock }}</span>
        </div>
      </section>

      <section class="card">
        <div class="section-title">
          <h2>Últimos movimientos</h2>
        </div>
        <div *ngIf="movements.length === 0" class="empty">Todavía no hay movimientos registrados.</div>
        <div *ngFor="let mov of movements.slice(0, 8)" class="mini-row">
          <div>
            <strong>{{ mov.item_code }} · {{ mov.item_name }}</strong>
            <span>{{ mov.performed_by_name }} · {{ mov.created_at | date:'short' }}</span>
          </div>
          <span class="pill" [class.success]="mov.movement_type === 'entrada'" [class.danger]="mov.movement_type === 'salida'">
            {{ mov.movement_type }} {{ mov.quantity }}
          </span>
        </div>
      </section>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  items: InventoryItem[] = [];
  movements: InventoryMovement[] = [];
  loading = true;

  constructor(private readonly itemsService: ItemsService, private readonly movementsService: MovementsService) {}

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
    return this.items.filter((item) => item.stock_status === 'low');
  }

  movementCount(type: 'entrada' | 'salida'): number {
    return this.movements.filter((movement) => movement.movement_type === type).length;
  }
}
