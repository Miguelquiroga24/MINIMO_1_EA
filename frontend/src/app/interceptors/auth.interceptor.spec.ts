import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;
  let navigate: ReturnType<typeof vi.spyOn>;

  const usersUrl = `${environment.apiUrl}/users`;
  const refreshUrl = `${environment.apiUrl}/auth/refresh`;
  const logoutUrl = `${environment.apiUrl}/auth/logout`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    // El token ya no está en localStorage: la sesión se prepara con un login simulado
    auth.login({ email: 'admin@example.com', password: 'studate26' }).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush({
      token: 'access-1',
      user: { _id: 'u1', name: 'Admin', email: 'a@b.c', role: 'admin' },
    });
  });

  afterEach(() => httpMock.verify());

  // logout() avisa a la API para que borre la cookie: en los tests hay que responder a esa petición
  function expectLogout(): void {
    httpMock.expectOne(logoutUrl).flush(null, { status: 204, statusText: 'No Content' });
  }

  it('adds the Authorization header with the token in memory', () => {
    http.get(usersUrl).subscribe();

    const req = httpMock.expectOne(usersUrl);
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-1');
    req.flush({});
  });

  it('does not add the header to the /auth routes', () => {
    http.post(`${environment.apiUrl}/auth/login`, {}).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('renews an expired token and repeats the request with the new one', () => {
    let response: unknown;
    http.get(usersUrl).subscribe((res) => (response = res));

    httpMock
      .expectOne(usersUrl)
      .flush({ message: 'El token ha caducado' }, { status: 401, statusText: 'Unauthorized' });

    // El refresh no lleva body: el refresh token va en la cookie
    const refresh = httpMock.expectOne(refreshUrl);
    expect(refresh.request.body).toEqual({});
    expect(refresh.request.withCredentials).toBe(true);
    refresh.flush({ token: 'access-2' });

    const retry = httpMock.expectOne(usersUrl);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer access-2');
    retry.flush({ users: [] });

    expect(response).toEqual({ users: [] });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('logs out when the token cannot be renewed', () => {
    let failed = false;
    http.get(usersUrl).subscribe({ error: () => (failed = true) });

    httpMock
      .expectOne(usersUrl)
      .flush({ message: 'El token ha caducado' }, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne(refreshUrl)
      .flush({ message: 'El token ha caducado' }, { status: 401, statusText: 'Unauthorized' });
    expectLogout();

    expect(failed).toBe(true);
    expect(auth.getToken()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('logs out on any other 401 without trying to renew', () => {
    http.get(usersUrl).subscribe({ error: () => undefined });

    httpMock
      .expectOne(usersUrl)
      .flush({ message: 'Token no válido' }, { status: 401, statusText: 'Unauthorized' });
    expectLogout();

    httpMock.expectNone(refreshUrl);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('lets other errors through without touching the session', () => {
    let status = 0;
    http.get(usersUrl).subscribe({ error: (err) => (status = err.status) });

    httpMock
      .expectOne(usersUrl)
      .flush({ message: 'Necesitas el rol admin' }, { status: 403, statusText: 'Forbidden' });

    expect(status).toBe(403);
    expect(auth.getToken()).toBe('access-1');
    expect(navigate).not.toHaveBeenCalled();
  });
});
