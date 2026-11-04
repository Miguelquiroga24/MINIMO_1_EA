import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { User } from '../../models';
import { AuthService } from '../../services/auth.service';
import { UserForm } from './user-form';

const admin: User = { _id: 'u1', name: 'Admin Studate', email: 'admin@example.com', role: 'admin', active: true };
const laia: User = { _id: 'u3', name: 'Laia Puig', email: 'laia@example.com', role: 'user', active: true };

describe('UserForm', () => {
  let fixture: ComponentFixture<UserForm>;
  let component: UserForm;
  let httpMock: HttpTestingController;
  const usersUrl = `${environment.apiUrl}/users`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserForm],
      // Al guardar el formulario navega a /users: le doy esa ruta (vacía) para que el router la encuentre
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'users', children: [] }]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);

    // Hay sesión de admin, como en el backoffice de verdad
    TestBed.inject(AuthService).login({ email: 'admin@example.com', password: 'studate26' }).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush({ token: 't', user: admin });

    fixture = TestBed.createComponent(UserForm);
    component = fixture.componentInstance;
  });

  afterEach(() => httpMock.verify());

  // Abre el formulario en modo editar con el usuario que devuelve la API
  function openEdit(user: User): void {
    fixture.componentRef.setInput('id', user._id);
    fixture.detectChanges();
    httpMock.expectOne(`${usersUrl}/${user._id}`).flush({ user });
  }

  it('asks for a matching password when creating', () => {
    fixture.detectChanges();
    component.form.patchValue({ name: 'Nuevo', email: 'nuevo@example.com' });
    expect(component.form.invalid).toBe(true);

    component.form.patchValue({ password: 'studate26', confirmPassword: 'otra-cosa' });
    expect(component.form.hasError('passwordMismatch')).toBe(true);

    component.form.patchValue({ confirmPassword: 'studate26' });
    expect(component.form.valid).toBe(true);
  });

  it('sends the role and active when creating', () => {
    fixture.detectChanges();
    component.form.patchValue({
      name: 'Nuevo',
      email: 'nuevo@example.com',
      password: 'studate26',
      confirmPassword: 'studate26',
      role: 'admin',
      active: false,
    });
    component.save();

    const req = httpMock.expectOne(usersUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Nuevo',
      email: 'nuevo@example.com',
      password: 'studate26',
      role: 'admin',
      active: false,
    });
    req.flush({ user: { ...laia, name: 'Nuevo' } });
  });

  it('does not ask for a password when editing and sends a PUT without it', () => {
    openEdit(laia);
    expect(component.form.valid).toBe(true);

    component.save();

    const req = httpMock.expectOne(`${usersUrl}/${laia._id}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.password).toBeUndefined();
    req.flush({ user: laia });
  });

  it('locks the role and active of my own user', () => {
    openEdit(admin);

    expect(component.isOwnUser()).toBe(true);
    expect(component.form.controls.role.disabled).toBe(true);
    expect(component.form.controls.active.disabled).toBe(true);
  });

  it('sends an empty photo to remove it', () => {
    openEdit({ ...laia, photo: 'data:image/jpeg;base64,AAAA' });
    component.removePhoto();
    component.save();

    const req = httpMock.expectOne(`${usersUrl}/${laia._id}`);
    expect(req.request.body.photo).toBe('');
    req.flush({ user: laia });
  });
});
