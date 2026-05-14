import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { InventoryItem, InventoryItemPayload, MessageResponse, StockStatus } from './api.types';

@Injectable({ providedIn: 'root' })
export class ItemsService {
  private readonly apiUrl = `${environment.apiUrl}/items`;

  constructor(private readonly http: HttpClient) {}

  list(search = '', status: StockStatus | 'all' = 'all'): Observable<InventoryItem[]> {
    let params = new HttpParams().set('status_filter', status);
    if (search.trim()) params = params.set('search', search.trim());
    return this.http.get<InventoryItem[]>(this.apiUrl, { params });
  }

  getByCode(code: string): Observable<InventoryItem> {
    return this.http.get<InventoryItem>(`${this.apiUrl}/code/${encodeURIComponent(code)}`);
  }

  create(payload: InventoryItemPayload): Observable<InventoryItem> {
    return this.http.post<InventoryItem>(this.apiUrl, payload);
  }

  update(id: string, payload: Partial<InventoryItemPayload>): Observable<InventoryItem> {
    return this.http.patch<InventoryItem>(`${this.apiUrl}/${id}`, payload);
  }

  deactivate(id: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/${id}`);
  }
}
