import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { User } from '../../models';
import { AuthService } from '../../services/auth.service';
import { UsersList } from './users-list';

const laia: User = {
  _id: 'u3',
  name: 'Laia Puig',
  email: 'laia@example.com',
  role: 'user',
  degree: 'Grau en Enginyeria Telemàtica',
  active: true,
  deleted: false,
};

const aina: User = { ...laia, _id: 'u7', name: 'Aina Roca', email: 'aina@example.com', active: false };
const admin: User = { ...laia, _id: 'u1', name: 'Admin Studate', email: 'admin@example.com', role: 'admin' };
const sara: User = { ...laia, _id: 'u13', name: 'Sara Molina', email: 'sara@example.com', deleted: true };

describe('UsersList', () => {
  let component: UsersList;
  let fixture: ComponentFixture<UsersList>;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/users`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);

    // Hay sesión del admin u1
    TestBed.inject(AuthService).login({ email: 'admin@example.com', password: 'studate26' }).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush({ token: 't', user: admin });

    fixture = TestBed.createComponent(UsersList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}?page=1&limit=10`)
      .flush({ users: [laia, aina], total: 12, page: 1, pages: 2 });
    await fixture.whenStable();
  });

  afterEach(() => httpMock.verify());

  it('paints one row per user with its state', () => {
    fixture.detectChanges();
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');

    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Laia Puig');
    expect(rows[0].textContent).toContain('Activo');
    expect(rows[1].textContent).toContain('Inactivo');
    expect(rows[1].classList).toContain('inactive');
  });

  it('asks the API for the selected page', () => {
    component.loadPage(2);

    httpMock.expectOne(`${baseUrl}?page=2&limit=10`).flush({ users: [], total: 12, page: 2, pages: 2 });

    expect(component.page()).toBe(2);
    expect(component.totalPages()).toBe(2);
  });

  it('goes back to the first page with the filters when one changes', () => {
    component.loadPage(2);
    httpMock.expectOne(`${baseUrl}?page=2&limit=10`).flush({ users: [], total: 12, page: 2, pages: 2 });

    component.role.set('admin');
    component.archived.set(true);
    component.loadPage(1);

    httpMock
      .expectOne(`${baseUrl}?page=1&limit=10&role=admin&archived=true`)
      .flush({ users: [], total: 0, page: 1, pages: 0 });

    expect(component.page()).toBe(1);
    expect(component.total()).toBe(0);
    expect(component.totalPages()).toBe(1);
  });

  // Botones de la fila de un usuario, por su texto
  function buttonsOf(rowIndex: number): string[] {
    fixture.detectChanges();
    const row = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')[rowIndex];
    return Array.from(row.querySelectorAll('button')).map((button) => button.textContent?.trim() ?? '');
  }

  it('archives after confirming in the modal and reloads the page', () => {
    component.askArchive(laia);
    expect(component.modalConfirmText()).toBe('Archivar');

    component.confirmAction();
    httpMock.expectOne(`${baseUrl}/u3/archive`).flush({ user: { ...laia, deleted: true } });

    httpMock.expectOne(`${baseUrl}?page=1&limit=10`).flush({ users: [aina], total: 11, page: 1, pages: 2 });
    expect(component.pending()).toBeNull();
    expect(component.users().length).toBe(1);
  });

  it('shows restore and delete for archived users, and the delete modal warns', () => {
    component.archived.set(true);
    component.loadPage(1);
    httpMock.expectOne(`${baseUrl}?page=1&limit=10&archived=true`).flush({ users: [sara], total: 1, page: 1, pages: 1 });

    expect(buttonsOf(0)).toEqual(['Restaurar', 'Eliminar para siempre']);

    component.askDelete(sara);
    expect(component.modalTitle()).toBe('¿Estás seguro de que quieres eliminar este usuario?');
    expect(component.modalMessage()).toContain('no se puede deshacer');
  });

  it('does not offer to archive my own user', () => {
    component.loadPage(1);
    httpMock.expectOne(`${baseUrl}?page=1&limit=10`).flush({ users: [admin, laia], total: 2, page: 1, pages: 1 });

    expect(buttonsOf(0)).toEqual(['Editar']);
    expect(buttonsOf(1)).toEqual(['Editar', 'Archivar']);
  });
});
