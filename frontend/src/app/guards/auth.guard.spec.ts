import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { adminGuard, authGuard, guestGuard } from './auth.guard';

describe('auth guards', () => {
  // Un guard funcional usa inject(), así que hay que llamarlo dentro de un contexto de inyección
  function run(guard: CanActivateFn, url = '/users'): boolean | UrlTree {
    return TestBed.runInInjectionContext(
      () =>
        guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot) as boolean | UrlTree,
    );
  }

  // La sesión ya no se lee de localStorage: se prepara con un login simulado
  function loginAs(role: 'user' | 'admin'): void {
    TestBed.inject(AuthService).login({ email: 'x@y.z', password: 'studate26' }).subscribe();
    TestBed.inject(HttpTestingController)
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ token: 't', user: { _id: 'u1', name: 'X', email: 'x@y.z', role } });
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  it('authGuard sends a visitor without a session to the login, remembering the url', () => {
    const result = run(authGuard, '/users');
    expect(result.toString()).toBe('/login?returnUrl=%2Fusers');
  });

  it('authGuard lets a user with a session in', () => {
    loginAs('user');
    expect(run(authGuard)).toBe(true);
  });

  it('adminGuard sends a user back to the home page', () => {
    loginAs('user');
    expect(run(adminGuard).toString()).toBe('/');
  });

  it('adminGuard lets an admin in', () => {
    loginAs('admin');
    expect(run(adminGuard)).toBe(true);
  });

  it('guestGuard sends a user with a session to the home page', () => {
    loginAs('user');
    expect(run(guestGuard).toString()).toBe('/');
  });

  it('guestGuard lets a visitor without a session in', () => {
    expect(run(guestGuard)).toBe(true);
  });
});
