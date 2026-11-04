import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  LoginRequest,
  LoginResponse,
  MeResponse,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  User,
} from '../models';

// Dónde se guarda cada token (está explicado con más detalle en el README):
//
//   - El access token solo en memoria, en una signal de este servicio. Nunca en localStorage ni en
//     sessionStorage: cualquier script que se ejecute en la página (un ataque XSS) podría leerlos.
//     Al recargar la página se pierde, y por eso al arrancar se llama a restoreSession().
//   - El refresh token no lo toca el frontend: el backend lo deja en una cookie HttpOnly, que
//     JavaScript no puede leer. El navegador la envía solo en las peticiones a /auth, y solo si la
//     petición lleva withCredentials: true.
const WITH_CREDENTIALS = { withCredentials: true };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private baseUrl = `${environment.apiUrl}/auth`;

  // El access token, solo en memoria. Lo lee el interceptor con getToken()
  private accessToken = signal<string | null>(null);

  // El usuario con sesión, o null si no hay sesión. Es privado y modificable aquí dentro;
  // fuera solo se puede leer (asReadonly), así nadie cambia la sesión sin pasar por este servicio
  private currentUser = signal<User | null>(null);
  readonly user = this.currentUser.asReadonly();

  // computed: se recalculan solos cada vez que cambia el usuario
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  /** POST /auth/register. No inicia sesión: la API no devuelve token y hay que hacer login */
  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/register`, data);
  }

  /** POST /auth/login. Si va bien, guarda el access token y el usuario en memoria.
   *  El refresh token llega en una cookie HttpOnly: el navegador la guarda él solo */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, credentials, WITH_CREDENTIALS)
      .pipe(
        // tap: hago algo con la respuesta sin cambiarla; el componente la sigue recibiendo igual
        tap((response) => {
          this.accessToken.set(response.token);
          this.currentUser.set(response.user);
        }),
      );
  }

  /** POST /auth/refresh. Pide un access token nuevo y lo guarda. No envía nada en el body:
   *  el refresh token va en la cookie, que el navegador adjunta gracias a withCredentials */
  refresh(): Observable<string> {
    return this.http.post<RefreshResponse>(`${this.baseUrl}/refresh`, {}, WITH_CREDENTIALS).pipe(
      tap((response) => this.accessToken.set(response.token)),
      // map: de la respuesta { token } me quedo solo con el texto del token
      map((response) => response.token),
    );
  }

  /** Recupera la sesión al arrancar la app (se llama desde app.config.ts, antes de pintar nada).
   *  Como el access token solo está en memoria, al recargar la página se ha perdido: pedimos uno
   *  nuevo con la cookie y después el usuario con GET /users/me. Si la cookie no existe o ha
   *  caducado, la API responde 401 y nos quedamos sin sesión: authGuard llevará al login */
  restoreSession(): Observable<void> {
    return this.refresh().pipe(
      // switchMap: con el token ya guardado, encadeno la petición del usuario
      // (el interceptor le añade la cabecera Authorization)
      switchMap(() => this.http.get<MeResponse>(`${environment.apiUrl}/users/me`)),
      tap((response) => this.currentUser.set(response.user)),
      map(() => undefined),
      // Sin cookie válida no hay sesión. Devuelvo of(undefined) para que la app arranque igual
      catchError(() => {
        this.clearSession();
        return of(undefined);
      }),
    );
  }

  /** Cierra la sesión: el backend borra la cookie, aquí se olvida el token y se va al login */
  logout(): void {
    // POST /auth/logout borra la cookie del refresh token. No espero la respuesta: pase lo que
    // pase, la sesión de este navegador se termina aquí
    this.http.post(`${this.baseUrl}/logout`, {}, WITH_CREDENTIALS).subscribe({
      error: () => undefined,
    });
    this.clearSession();
    this.router.navigate(['/login']);
  }

  /** El access token en memoria, o null si no hay sesión. Lo usa el interceptor */
  getToken(): string | null {
    return this.accessToken();
  }

  private clearSession(): void {
    this.accessToken.set(null);
    this.currentUser.set(null);
  }
}
