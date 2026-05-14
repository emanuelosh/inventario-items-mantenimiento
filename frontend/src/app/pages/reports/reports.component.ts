import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { Observable, finalize } from 'rxjs';
import { getHttpErrorMessage } from '../../core/http-error';
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
        <p>Descarga inventario completo y movimientos en Excel o PDF.</p>
      </div>
    </div>

    <p class="error" *ngIf="error">{{ error }}</p>

    <section class="reports-grid">
      <article class="card report-card">
        <span class="report-icon">📦</span>
        <h2>Inventario completo</h2>
        <p>Incluye código, nombre, stock actual, mínimos, máximos y estado.</p>
        <div class="button-row">
          <button class="primary-btn" type="button" [disabled]="!!downloading" (click)="downloadInventoryExcel()">
            {{ downloading === 'inventoryExcel' ? 'Descargando...' : 'Excel' }}
          </button>
          <button class="ghost-btn" type="button" [disabled]="!!downloading" (click)="downloadInventoryPdf()">
            {{ downloading === 'inventoryPdf' ? 'Descargando...' : 'PDF' }}
          </button>
        </div>
      </article>

      <article class="card report-card">
        <span class="report-icon">🔁</span>
        <h2>Movimientos</h2>
        <p>Incluye entradas, salidas, usuario, stock anterior y stock nuevo.</p>
        <div class="button-row">
          <button class="primary-btn" type="button" [disabled]="!!downloading" (click)="downloadMovementsExcel()">
            {{ downloading === 'movementsExcel' ? 'Descargando...' : 'Excel' }}
          </button>
          <button class="ghost-btn" type="button" [disabled]="!!downloading" (click)="downloadMovementsPdf()">
            {{ downloading === 'movementsPdf' ? 'Descargando...' : 'PDF' }}
          </button>
        </div>
      </article>
    </section>
  `
})
export class ReportsComponent {
  error = '';
  downloading: ReportDownload = '';

  constructor(
    private readonly reportsService: ReportsService,
    private readonly cdr: ChangeDetectorRef
  ) {}

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
      .pipe(
        finalize(() => {
          this.downloading = '';
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (blob) => this.reportsService.saveBlob(blob, filename),
        error: (err) => {
          console.error('Error descargando reporte:', err);
          this.error = getHttpErrorMessage(err, 'No fue posible descargar el reporte.');
        }
      });
  }
}
