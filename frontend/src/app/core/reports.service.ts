import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly apiUrl = `${environment.apiUrl}/reports`;

  constructor(private readonly http: HttpClient) {}

  inventoryExcel(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/inventory/excel`, { responseType: 'blob' });
  }

  inventoryPdf(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/inventory/pdf`, { responseType: 'blob' });
  }

  movementsExcel(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/movements/excel`, { responseType: 'blob' });
  }

  movementsPdf(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/movements/pdf`, { responseType: 'blob' });
  }

  saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
