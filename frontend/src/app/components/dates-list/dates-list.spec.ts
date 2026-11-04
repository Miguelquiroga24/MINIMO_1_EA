import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { StudateDate, UserRole } from '../../models';
import { AuthService } from '../../services/auth.service';
import { DatesList } from './dates-list';

const usuario = { _id: 'u2', name: 'Usuario', email: 'user@example.com' };
const oriol = { _id: 'u12', name: 'Oriol Costa', email: 'oriol@example.com' };

const date: StudateDate = {
  _id: 'd1',
  users: [usuario, oriol],
  status: 'pending',
  firstTurn: 'u12',
  expiresAt: '2099-01-01T10:00:00.000Z',
  extended: false,
  createdAt: '2026-11-03T10:00:00.000Z',
};

describe('DatesList', () => {
  let component: DatesList;
  let fixture: ComponentFixture<DatesList>;
  let httpMock: HttpTestingController;
  const datesUrl = `${environment.apiUrl}/dates`;

  // Prepara la pantalla con una sesión del rol que se pida
  async function setup(role: UserRole): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [DatesList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    const me = role === 'admin' ? { _id: 'u1', name: 'Admin', email: 'admin@example.com', role } : { ...usuario, role };
    TestBed.inject(AuthService).login({ email: me.email, password: 'studate26' }).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush({ token: 't', user: me });

    fixture = TestBed.createComponent(DatesList);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Se entra en la bandeja de Pendientes
    httpMock.expectOne(`${datesUrl}?page=1&limit=10&status=pending`).flush({ dates: [date], total: 1, page: 1, pages: 1 });
    if (role === 'admin') {
      httpMock.expectOne((request) => request.url === `${environment.apiUrl}/users`).flush({ users: [], total: 0, page: 1, pages: 0 });
    }
    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => httpMock.verify());

  it('shows a user who the Date is with and who starts, without the delete button', async () => {
    await setup('user');
    const row = (fixture.nativeElement as HTMLElement).querySelector('tbody tr');

    expect(row?.textContent).toContain('Oriol Costa');
    expect(component.firstTurnName(date)).toBe('Oriol');
    expect(row?.textContent).not.toContain('Eliminar');
    expect(component.isAdmin()).toBe(false);
  });

  it('shows the admin both users and the delete button', async () => {
    await setup('admin');
    const row = (fixture.nativeElement as HTMLElement).querySelector('tbody tr');

    expect(row?.textContent).toContain('Usuario');
    expect(row?.textContent).toContain('Oriol Costa');
    expect(row?.textContent).toContain('Eliminar');
  });

  it('changes tab and asks for that status from the first page', async () => {
    await setup('user');
    component.selectTab('');

    httpMock.expectOne(`${datesUrl}?page=1&limit=10`).flush({ dates: [], total: 0, page: 1, pages: 0 });
    expect(component.status()).toBe('');
  });

  it('shows the API message when the extension was already used', async () => {
    await setup('user');
    component.extend(date);

    httpMock
      .expectOne(`${datesUrl}/d1/extend`)
      .flush({ message: 'La prórroga de este Date ya se ha usado' }, { status: 409, statusText: 'Conflict' });
    expect(component.error()).toBe('La prórroga de este Date ya se ha usado');
  });
});
