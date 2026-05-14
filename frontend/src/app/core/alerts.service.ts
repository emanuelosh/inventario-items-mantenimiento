import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MessageResponse, StockAlert } from './api.types';

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private readonly apiUrl = `${environment.apiUrl}/alerts`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<StockAlert[]> {
    return this.http.get<StockAlert[]>(this.apiUrl);
  }

  testEmail(): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/test-email`, {});
  }
}
