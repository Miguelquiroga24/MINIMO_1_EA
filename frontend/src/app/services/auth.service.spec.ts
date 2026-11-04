import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../environments/environment';
import { LoginResponse } from '../models';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const loginUrl = `${environment.apiUrl}/auth/login`;
  const refreshUrl = `${environment.apiUrl}/auth/refresh`;
  const logoutUrl = `${environment.apiUrl}/auth/logout`;
  const meUrl = `${environment.apiUrl}/users/me`;

  // La API ya no devuelve el refresh token en el JSON: va en una cookie HttpOnly
  const loginResponse: LoginResponse = {
    token: 'access-1',
    user: { _id: 'u1', name: 'Admin', email: 'admin@example.com', role: 'admin' },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('starts without a session', () => {
    expect(service.user()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
    expect(service.getToken()).toBeNull();
  });

  it('register() posts name, email and password and does not start a session', () => {
    service.register({ name: 'Ana', email: 'ana@example.com', password: 'studate26' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'studate26',
    });
    req.flush({ user: { ...loginResponse.user, role: 'user' } });

    expect(service.isLoggedIn()).toBe(false);
  });

  it('login() sends the cookies and keeps the token only in memory', () => {
    service.login({ email: 'admin@example.com', password: 'studate26' }).subscribe();

    const req = httpMock.expectOne(loginUrl);
    expect(req.request.withCredentials).toBe(true);
    req.flush(loginResponse);

    expect(service.getToken()).toBe('access-1');
    expect(service.user()).toEqual(loginResponse.user);
    expect(service.isAdmin()).toBe(true);
    // Nada en el almacenamiento del navegador
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('a failed login does not store anything', () => {
    service
      .login({ email: 'admin@example.com', password: 'mala12345' })
      .subscribe({ error: () => undefined });
    httpMock
      .expectOne(loginUrl)
      .flush(
        { message: 'Email o contraseña incorrectos' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(service.isLoggedIn()).toBe(false);
    expect(service.getToken()).toBeNull();
  });

  it('refresh() posts without body, with credentials, and stores the new access token', () => {
    let newToken = '';
    service.refresh().subscribe((token) => (newToken = token));

    const req = httpMock.expectOne(refreshUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    expect(req.request.withCredentials).toBe(true);
    req.flush({ token: 'access-2' });

    expect(newToken).toBe('access-2');
    expect(service.getToken()).toBe('access-2');
  });

  it('restoreSession() renews the token and loads the user from /users/me', () => {
    let done = false;
    service.restoreSession().subscribe(() => (done = true));

    httpMock.expectOne(refreshUrl).flush({ token: 'access-3' });
    httpMock.expectOne(meUrl).flush({ user: loginResponse.user });

    expect(done).toBe(true);
    expect(service.getToken()).toBe('access-3');
    expect(service.user()).toEqual(loginResponse.user);
  });

  it('restoreSession() leaves the app without a session when the cookie is not valid', () => {
    let done = false;
    service.restoreSession().subscribe(() => (done = true));

    httpMock
      .expectOne(refreshUrl)
      .flush({ message: 'Falta el refresh token' }, { status: 401, statusText: 'Unauthorized' });

    httpMock.expectNone(meUrl);
    expect(done).toBe(true);
    expect(service.isLoggedIn()).toBe(false);
    expect(service.getToken()).toBeNull();
  });

  it('logout() asks the API to delete the cookie, clears the session and goes to the login page', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    service.login({ email: 'admin@example.com', password: 'studate26' }).subscribe();
    httpMock.expectOne(loginUrl).flush(loginResponse);

    service.logout();

    const req = httpMock.expectOne(logoutUrl);
    expect(req.request.withCredentials).toBe(true);
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(service.user()).toBeNull();
    expect(service.getToken()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
