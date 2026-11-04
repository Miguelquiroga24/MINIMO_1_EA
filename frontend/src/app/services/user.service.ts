import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  CreateUser,
  DirectoryResponse,
  UpdateUser,
  UserFilters,
  UserResponse,
  UsersPage,
} from '../models';

// Las llamadas a /users. Casi todas son de la gestión de usuarios del backoffice, solo para admin
// (la API responde 403 a los demás); getDirectory la puede usar cualquier usuario con sesión
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/users`;

  /** GET /users con la página y los filtros. Solo se envían los filtros que tienen valor */
  getUsers(page: number, limit: number, filters: UserFilters): Observable<UsersPage> {
    let params = new HttpParams().set('page', page).set('limit', limit);

    if (filters.search.trim()) {
      params = params.set('search', filters.search.trim());
    }
    if (filters.role) {
      params = params.set('role', filters.role);
    }
    if (filters.active) {
      params = params.set('active', filters.active);
    }
    if (filters.degree) {
      params = params.set('degree', filters.degree);
    }
    if (filters.archived) {
      params = params.set('archived', true);
    }

    return this.http.get<UsersPage>(this.baseUrl, { params });
  }

  /** GET /users/directory: con quién puede abrir un Date el usuario con sesión (cualquier rol) */
  getDirectory(): Observable<DirectoryResponse> {
    return this.http.get<DirectoryResponse>(`${this.baseUrl}/directory`);
  }

  /** GET /users/:id (también si está inactivo o archivado) */
  getUser(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/${id}`);
  }

  /** POST /users */
  createUser(payload: CreateUser): Observable<UserResponse> {
    return this.http.post<UserResponse>(this.baseUrl, payload);
  }

  /** PUT /users/:id */
  updateUser(id: string, payload: UpdateUser): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.baseUrl}/${id}`, payload);
  }

  /** POST /users/:id/archive: borrado lógico, se puede restaurar */
  archiveUser(id: string): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/${id}/archive`, {});
  }

  /** POST /users/:id/restore */
  restoreUser(id: string): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/${id}/restore`, {});
  }

  /** DELETE /users/:id: borrado físico, solo de usuarios archivados (si no, la API responde 409) */
  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
