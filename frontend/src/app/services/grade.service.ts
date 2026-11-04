import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { CreateGrade, GradeFilters, GradeResponse, GradesPage, GradeValue } from '../models';

// Las llamadas a los votos de La Orla (/grades). Son solo para admin
@Injectable({ providedIn: 'root' })
export class GradeService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/grades`;

  /** GET /grades con la página y los filtros. Solo se envían los filtros que tienen valor */
  getGrades(page: number, limit: number, filters: GradeFilters): Observable<GradesPage> {
    let params = new HttpParams().set('page', page).set('limit', limit);

    if (filters.value) {
      params = params.set('value', filters.value);
    }
    if (filters.user) {
      params = params.set('user', filters.user);
    }

    return this.http.get<GradesPage>(this.baseUrl, { params });
  }

  /** POST /grades */
  createGrade(payload: CreateGrade): Observable<GradeResponse> {
    return this.http.post<GradeResponse>(this.baseUrl, payload);
  }

  /** PUT /grades/:id: solo se cambia la nota */
  updateGrade(id: string, value: GradeValue): Observable<GradeResponse> {
    return this.http.put<GradeResponse>(`${this.baseUrl}/${id}`, { value });
  }

  /** DELETE /grades/:id: borrado físico, un voto no se archiva */
  deleteGrade(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
