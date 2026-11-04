import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let component: Login;
  let httpMock: HttpTestingController;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => httpMock.verify());

  it('shows the message of the API when the credentials are wrong', async () => {
    component.form.setValue({ email: 'admin@example.com', password: 'mala12345' });
    component.login();
    httpMock
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush(
        { message: 'Email o contraseña incorrectos' },
        { status: 401, statusText: 'Unauthorized' },
      );
    await fixture.whenStable();

    const alert = (fixture.nativeElement as HTMLElement).querySelector('.alert');
    expect(alert?.textContent?.trim()).toBe('Email o contraseña incorrectos');
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('goes back to the page it came from after logging in', () => {
    fixture.componentRef.setInput('returnUrl', '/users');
    component.form.setValue({ email: 'admin@example.com', password: 'studate26' });
    component.login();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush({
      token: 't',
      user: { _id: 'u1', name: 'Admin', email: 'admin@example.com', role: 'admin' },
    });

    expect(navigateByUrl).toHaveBeenCalledWith('/users', { replaceUrl: true });
  });

  it('ignores a returnUrl that points outside the app and goes to the Dates', () => {
    fixture.componentRef.setInput('returnUrl', 'https://example.com');
    component.form.setValue({ email: 'admin@example.com', password: 'studate26' });
    component.login();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush({
      token: 't',
      user: { _id: 'u1', name: 'Admin', email: 'admin@example.com', role: 'admin' },
    });

    expect(navigateByUrl).toHaveBeenCalledWith('/dates', { replaceUrl: true });
  });

  it('sends a user to the Dates too', () => {
    component.form.setValue({ email: 'user@example.com', password: 'studate26' });
    component.login();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush({
      token: 't',
      user: { _id: 'u2', name: 'Usuario', email: 'user@example.com', role: 'user' },
    });

    expect(navigateByUrl).toHaveBeenCalledWith('/dates', { replaceUrl: true });
  });
});
