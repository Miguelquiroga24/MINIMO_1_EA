import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  CreateReview,
  ReviewFilters,
  ReviewResponse,
  ReviewsPage,
  ReviewStatsResponse,
  UpdateReview,
} from '../models';

// Todas las llamadas a las valoraciones de los Dates (/reviews). El token lo pone el interceptor,
// y quién puede ver, editar o eliminar cada una lo decide la API a partir de él
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/reviews`;

  /** GET /reviews con la página y los filtros. Solo se envían los filtros que tienen valor */
  getReviews(page: number, limit: number, filters: ReviewFilters): Observable<ReviewsPage> {
    let params = new HttpParams().set('page', page).set('limit', limit);

    if (filters.search.trim()) {
      params = params.set('search', filters.search.trim());
    }
    if (filters.date) {
      params = params.set('date', filters.date);
    }
    if (filters.minScore !== '') {
      params = params.set('minScore', filters.minScore);
    }

    return this.http.get<ReviewsPage>(this.baseUrl, { params });
  }

  /** GET /reviews/:id */
  getReview(id: string): Observable<ReviewResponse> {
    return this.http.get<ReviewResponse>(`${this.baseUrl}/${id}`);
  }

  /** GET /reviews/stats/:dateId: el resumen estadístico de un Date */
  getStats(dateId: string): Observable<ReviewStatsResponse> {
    return this.http.get<ReviewStatsResponse>(`${this.baseUrl}/stats/${dateId}`);
  }

  /** POST /reviews (el autor lo pone la API con el token) */
  createReview(payload: CreateReview): Observable<ReviewResponse> {
    return this.http.post<ReviewResponse>(this.baseUrl, payload);
  }

  /** PUT /reviews/:id (solo el autor o un admin; si no, 403) */
  updateReview(id: string, payload: UpdateReview): Observable<ReviewResponse> {
    return this.http.put<ReviewResponse>(`${this.baseUrl}/${id}`, payload);
  }

  /** DELETE /reviews/:id (solo el autor o un admin; si no, 403) */
  deleteReview(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
