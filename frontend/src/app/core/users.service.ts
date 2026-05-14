import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MessageResponse, RegisterRequest, User } from './api.types';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly apiUrl = `${environment.apiUrl}/users`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  create(payload: RegisterRequest): Observable<User> {
    return this.http.post<User>(this.apiUrl, payload);
  }

  update(id: string, payload: Partial<Pick<User, 'full_name' | 'role' | 'is_active'>>): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}`, payload);
  }

  deactivate(id: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/${id}`);
  }
}
