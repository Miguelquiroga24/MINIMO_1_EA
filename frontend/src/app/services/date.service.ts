import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { CreateDate, DateFilters, DateResponse, DatesPage, DateStatus } from '../models';

// Las llamadas a los Dates (/dates). Las usan el admin (ve todos) y los usuarios normales (solo los
// suyos): quién ve qué lo decide la API a partir del token
@Injectable({ providedIn: 'root' })
export class DateService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/dates`;

  /** GET /dates con la página y los filtros. Solo se envían los filtros que tienen valor */
  getDates(page: number, limit: number, filters: DateFilters): Observable<DatesPage> {
    let params = new HttpParams().set('page', page).set('limit', limit);

    if (filters.status) {
      params = params.set('status', filters.status);
    }
    if (filters.user) {
      params = params.set('user', filters.user);
    }

    return this.http.get<DatesPage>(this.baseUrl, { params });
  }

  /** POST /dates */
  createDate(payload: CreateDate): Observable<DateResponse> {
    return this.http.post<DateResponse>(this.baseUrl, payload);
  }

  /** PUT /dates/:id: cambiar de bandeja */
  updateStatus(id: string, status: DateStatus): Observable<DateResponse> {
    return this.http.put<DateResponse>(`${this.baseUrl}/${id}`, { status });
  }

  /** POST /dates/:id/extend: la prórroga, 24 horas más (solo una vez; la segunda, 409) */
  extendDate(id: string): Observable<DateResponse> {
    return this.http.post<DateResponse>(`${this.baseUrl}/${id}/extend`, {});
  }

  /** DELETE /dates/:id (solo admin) */
  deleteDate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
