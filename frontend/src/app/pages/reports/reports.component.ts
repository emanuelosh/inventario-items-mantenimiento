import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Observable, finalize, forkJoin } from 'rxjs';
import { InventoryItem, InventoryMovement, StockStatus } from '../../core/api.types';
import { getHttpErrorMessage } from '../../core/http-error';
import { ItemsService } from '../../core/items.service';
import { MovementsService } from '../../core/movements.service';
import { ReportsService } from '../../core/reports.service';

type ReportDownload = 'inventoryExcel' | 'inventoryPdf' | 'movementsExcel' | 'movementsPdf' | '';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Reportes</h1>
        <p>Exporta inventario y movimientos en Excel o PDF para análisis externo.</p>
      </div>
    </div>

    <p class="error" *ngIf="error" style="margin-bottom:16px;">{{ error }}</p>

    <!-- Quick stats -->
    <div class="stats-grid" *ngIf="!loadingStats" style="margin-bottom:28px;">
      <article class="stat-card">
        <div class="stat-card-icon">📦</div>
        <span class="stat-card-label">Artículos activos</span>
        <span class="stat-card-value">{{ totalItems }}</span>
        <span class="stat-card-sub">en inventario</span>
      </article>
      <article class="stat-card warning">
        <div class="stat-card-icon">⚠</div>
        <span class="stat-card-label">Stock mínimo</span>
        <span class="stat-card-value">{{ lowItems }}</span>
        <span class="stat-card-sub">necesitan reposición</span>
      </article>
      <article class="stat-card success">
        <div class="stat-card-icon">↑</div>
        <span class="stat-card-label">Entradas registradas</span>
        <span class="stat-card-value">{{ totalEntradas }}</span>
        <span class="stat-card-sub">movimientos</span>
      </article>
      <article class="stat-card info">
        <div class="stat-card-icon">↓</div>
        <span class="stat-card-label">Salidas registradas</span>
        <span class="stat-card-value">{{ totalSalidas }}</span>
        <span class="stat-card-sub">movimientos</span>
      </article>
    </div>

    <!-- Export cards -->
    <div class="reports-grid">
      <article class="card report-card">
        <div style="display:flex; align-items:center; gap:14px; margin-bottom:4px;">
          <div class="report-card-icon">📦</div>
          <div>
            <h2 style="margin:0; font-size:1.05rem;">Inventario completo</h2>
            <p style="color:var(--text-secondary); font-size:0.875rem; margin:4px 0 0;">
              Código, nombre, stock actual, mínimos, máximos y estado de todos los artículos.
            </p>
          </div>
        </div>

        <div class="divider"></div>

        <div class="button-row">
          <button
            class="primary-btn"
            type="button"
            [disabled]="!!downloading"
            (click)="downloadInventoryExcel()"
            style="flex:1;"
          >
            <span *ngIf="downloading === 'inventoryExcel'" class="spinner"></span>
            {{ downloading === 'inventoryExcel' ? 'Descargando...' : '⬇ Excel (.xlsx)' }}
          </button>
          <button
            class="ghost-btn"
            type="button"
            [disabled]="!!downloading"
            (click)="downloadInventoryPdf()"
            style="flex:1;"
          >
            <span *ngIf="downloading === 'inventoryPdf'" class="spinner"></span>
            {{ downloading === 'inventoryPdf' ? 'Descargando...' : '⬇ PDF' }}
          </button>
        </div>
      </article>

      <article class="card report-card">
        <div style="display:flex; align-items:center; gap:14px; margin-bottom:4px;">
          <div class="report-card-icon">⇄</div>
          <div>
            <h2 style="margin:0; font-size:1.05rem;">Historial de movimientos</h2>
            <p style="color:var(--text-secondary); font-size:0.875rem; margin:4px 0 0;">
              Entradas, salidas, usuario, stock anterior y stock nuevo con fechas completas.
            </p>
          </div>
        </div>

        <div class="divider"></div>

        <div class="button-row">
          <button
            class="primary-btn"
            type="button"
            [disabled]="!!downloading"
            (click)="downloadMovementsExcel()"
            style="flex:1;"
          >
            <span *ngIf="downloading === 'movementsExcel'" class="spinner"></span>
            {{ downloading === 'movementsExcel' ? 'Descargando...' : '⬇ Excel (.xlsx)' }}
          </button>
          <button
            class="ghost-btn"
            type="button"
            [disabled]="!!downloading"
            (click)="downloadMovementsPdf()"
            style="flex:1;"
          >
            <span *ngIf="downloading === 'movementsPdf'" class="spinner"></span>
            {{ downloading === 'movementsPdf' ? 'Descargando...' : '⬇ PDF' }}
          </button>
        </div>
      </article>
    </div>

    <!-- Top consumed items -->
    <section class="card" *ngIf="!loadingStats && topConsumed.length > 0" style="margin-top:18px;">
      <div class="section-title">
        <h2>Artículos más consumidos</h2>
        <span class="pill">últimos movimientos</span>
      </div>
      <div *ngFor="let item of topConsumed; let i = index" class="mini-row">
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="width:24px; height:24px; background:var(--gray-100); border-radius:50%; display:grid; place-items:center; font-size:0.78rem; font-weight:700; flex-shrink:0;">{{ i + 1 }}</span>
          <div>
            <strong>{{ item.name }}</strong>
            <span>{{ item.code }}</span>
          </div>
        </div>
        <span class="pill danger">{{ item.salidas }} salidas</span>
      </div>
    </section>
  `
})
export class ReportsComponent implements OnInit {
  error = '';
  downloading: ReportDownload = '';
  loadingStats = true;

  totalItems = 0;
  lowItems = 0;
  totalEntradas = 0;
  totalSalidas = 0;
  topConsumed: Array<{ name: string; code: string; salidas: number }> = [];

  constructor(
    private readonly reportsService: ReportsService,
    private readonly itemsService: ItemsService,
    private readonly movementsService: MovementsService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    forkJoin({
      items: this.itemsService.list(),
      movements: this.movementsService.list(500)
    }).subscribe({
      next: ({ items, movements }) => {
        this.totalItems = items.filter((i) => i.is_active).length;
        this.lowItems = items.filter((i) => i.stock_status === 'low').length;
        this.totalEntradas = movements.filter((m) => m.movement_type === 'entrada').length;
        this.totalSalidas = movements.filter((m) => m.movement_type === 'salida').length;

        const salidasPorCodigo = movements
          .filter((m) => m.movement_type === 'salida')
          .reduce((acc: Record<string, { name: string; code: string; count: number }>, m) => {
            if (!acc[m.item_code]) acc[m.item_code] = { name: m.item_name, code: m.item_code, count: 0 };
            acc[m.item_code].count += 1;
            return acc;
          }, {});

        this.topConsumed = Object.values(salidasPorCodigo)
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
          .map((i) => ({ name: i.name, code: i.code, salidas: i.count }));

        this.loadingStats = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingStats = false; this.cdr.detectChanges(); }
    });
  }

  downloadInventoryExcel(): void {
    this.download(this.reportsService.inventoryExcel(), 'reporte_inventario.xlsx', 'inventoryExcel');
  }

  downloadInventoryPdf(): void {
    this.download(this.reportsService.inventoryPdf(), 'reporte_inventario.pdf', 'inventoryPdf');
  }

  downloadMovementsExcel(): void {
    this.download(this.reportsService.movementsExcel(), 'reporte_movimientos.xlsx', 'movementsExcel');
  }

  downloadMovementsPdf(): void {
    this.download(this.reportsService.movementsPdf(), 'reporte_movimientos.pdf', 'movementsPdf');
  }

  private download(request: Observable<Blob>, filename: string, key: ReportDownload): void {
    if (this.downloading) return;
    this.error = '';
    this.downloading = key;
    this.cdr.detectChanges();

    request
      .pipe(finalize(() => { this.downloading = ''; this.cdr.detectChanges(); }))
      .subscribe({
        next: (blob) => this.reportsService.saveBlob(blob, filename),
        error: (err) => { this.error = getHttpErrorMessage(err, 'No fue posible descargar el reporte.'); }
      });
  }
}
