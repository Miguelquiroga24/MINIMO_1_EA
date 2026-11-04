import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { environment } from '../environments/environment';
import { AuthService } from './services/auth.service';

describe('App', () => {
  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  }

  // La sesión ya no se lee de localStorage: se prepara con un login simulado
  function loginAs(role: 'user' | 'admin'): void {
    TestBed.inject(AuthService).login({ email: 'x@y.z', password: 'studate26' }).subscribe();
    TestBed.inject(HttpTestingController)
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ token: 't', user: { _id: 'u1', name: 'X', email: 'x@y.z', role } });
  }

  async function navLinks(): Promise<(string | undefined)[]> {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    return Array.from(compiled.querySelectorAll('nav a')).map((a) => a.textContent?.trim());
  }

  it('should create the app', async () => {
    await setup();
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('without a session the navigation bar offers login and register', async () => {
    await setup();
    expect(await navLinks()).toEqual(['Iniciar sesión', 'Registrarse']);
  });

  it('an admin sees the backoffice link', async () => {
    await setup();
    loginAs('admin');
    expect(await navLinks()).toEqual(['Dates', 'Usuarios', 'La Orla']);
  });

  it('a user only sees the Dates link', async () => {
    await setup();
    loginAs('user');
    expect(await navLinks()).toEqual(['Dates']);
  });
});
