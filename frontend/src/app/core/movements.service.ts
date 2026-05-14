import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { InventoryMovement, MovementPayload, MovementResponse, MovementType } from './api.types';

@Injectable({ providedIn: 'root' })
export class MovementsService {
  private readonly apiUrl = `${environment.apiUrl}/movements`;

  constructor(private readonly http: HttpClient) {}

  list(limit = 200, itemId?: string, type?: MovementType): Observable<InventoryMovement[]> {
    let params = new HttpParams().set('limit', limit);
    if (itemId) params = params.set('item_id', itemId);
    if (type) params = params.set('movement_type', type);
    return this.http.get<InventoryMovement[]>(this.apiUrl, { params });
  }

  create(payload: MovementPayload): Observable<MovementResponse> {
    return this.http.post<MovementResponse>(this.apiUrl, payload);
  }
}
